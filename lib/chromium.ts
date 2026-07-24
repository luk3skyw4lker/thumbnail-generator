import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import chromium, {
	inflate,
	setupLambdaEnvironment
} from '@sparticuz/chromium';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

/**
 * Original: `const isDev = !process.env.AWS_REGION`
 * Do NOT gate on NODE_ENV — `next start` is production locally and must
 * still use system Chrome (sparticuz binary is Linux-only → ENOEXEC on macOS).
 */
const isDev =
	!process.env.AWS_REGION &&
	!process.env.VERCEL &&
	!process.env.AWS_LAMBDA_FUNCTION_NAME;

/** Match the original Rocketseat viewport. */
const VIEWPORT = { width: 2048, height: 1170 };

const chromeExecPaths: Record<string, string> = {
	win32: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	linux: '/usr/bin/google-chrome',
	darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
};

let browser: Browser | null = null;

/**
 * Fluid Compute runs concurrent invocations in one process.
 * Old shared `_page` races under that — serialize + fresh page per request.
 */
let renderLock: Promise<void> = Promise.resolve();

/**
 * Fluid Compute does not set AWS Lambda env vars. Without them (or an
 * equivalent), @sparticuz/chromium skips extracting al2023.tar.br →
 * `/tmp/chromium: error while loading shared libraries: libnspr4.so`.
 *
 * Set the runtime hint + LD_LIBRARY_PATH, and force-extract AL2023 libs.
 */
async function resolveChromiumExecutable(): Promise<string> {
	process.env.AWS_LAMBDA_JS_RUNTIME ??= 'nodejs22.x';

	const libDir = join(tmpdir(), 'al2023', 'lib');
	setupLambdaEnvironment(libDir);

	chromium.setGraphicsMode = false;

	const chromiumPath = join(tmpdir(), 'chromium');
	const libnspr = join(libDir, 'libnspr4.so');

	// Stale binary from a previous extract that skipped AL2023 libs
	if (existsSync(chromiumPath) && !existsSync(libnspr)) {
		try {
			await unlink(chromiumPath);
		} catch {
			// ignore
		}
	}

	const executablePath = await chromium.executablePath();

	// Detection still failed — inflate AL2023 libs ourselves
	if (!existsSync(libnspr)) {
		const binDir = join(
			process.cwd(),
			'node_modules',
			'@sparticuz',
			'chromium',
			'bin'
		);
		const al2023Archive = join(binDir, 'al2023.tar.br');

		if (!existsSync(al2023Archive)) {
			throw new Error(
				`Missing ${al2023Archive}. Ensure next.config outputFileTracingIncludes covers @sparticuz/chromium/bin.`
			);
		}

		await inflate(al2023Archive);
		setupLambdaEnvironment(libDir);
	}

	if (!existsSync(libnspr)) {
		throw new Error(
			`Chromium AL2023 libs missing after extract (${libnspr}). Check AWS_LAMBDA_JS_RUNTIME / Fluid setup.`
		);
	}

	return executablePath;
}

async function resetBrowser() {
	if (browser) {
		try {
			await browser.close();
		} catch {
			// ignore
		}
		browser = null;
	}
}

async function getBrowser(): Promise<Browser> {
	if (browser?.connected) {
		return browser;
	}

	await resetBrowser();

	if (isDev) {
		const executablePath = chromeExecPaths[process.platform];
		if (!executablePath) {
			throw new Error(`No Chrome path for platform ${process.platform}`);
		}

		browser = await puppeteer.launch({
			args: [],
			executablePath,
			headless: true,
			defaultViewport: VIEWPORT
		});

		return browser;
	}

	browser = await puppeteer.launch({
		args: chromium.args,
		defaultViewport: VIEWPORT,
		executablePath: await resolveChromiumExecutable(),
		headless: 'shell'
	});

	return browser;
}

async function takeScreenshot(html: string): Promise<Buffer> {
	const activeBrowser = await getBrowser();
	const page: Page = await activeBrowser.newPage();

	try {
		await page.setViewport(VIEWPORT);
		await page.setContent(html);
		const file = await page.screenshot({ type: 'png' });
		return Buffer.from(file);
	} finally {
		try {
			if (!page.isClosed()) await page.close();
		} catch {
			// ignore
		}
	}
}

export async function getScreenshot(html: string): Promise<Buffer> {
	let release!: () => void;
	const previous = renderLock;
	renderLock = new Promise<void>((resolve) => {
		release = resolve;
	});

	await previous;

	try {
		return await takeScreenshot(html);
	} catch (error) {
		await resetBrowser();
		throw error;
	} finally {
		release();
	}
}
