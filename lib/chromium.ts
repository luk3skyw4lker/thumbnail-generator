import chromium from '@sparticuz/chromium';
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

	// Same shape as old chrome-aws-lambda options, swapped to @sparticuz/chromium
	chromium.setGraphicsMode = false;

	browser = await puppeteer.launch({
		args: chromium.args,
		defaultViewport: VIEWPORT,
		executablePath: await chromium.executablePath(),
		// Newer @sparticuz/chromium no longer exports `.headless`
		headless: 'shell'
	});

	return browser;
}

async function takeScreenshot(html: string): Promise<Buffer> {
	const activeBrowser = await getBrowser();
	// Fresh page per request (old reused one page — unsafe under Fluid)
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
