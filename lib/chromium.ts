import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const isDev = process.env.NODE_ENV === 'development';

const chromeExecPaths: Record<string, string> = {
	win32: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	linux: '/usr/bin/google-chrome',
	darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
};

const VIEWPORT = { width: 1200, height: 630 };

let browser: Browser | null = null;

/** Serialize renders — a shared page races under concurrent requests. */
let renderQueue: Promise<unknown> = Promise.resolve();

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
			throw new Error(`Unsupported platform for local Chrome: ${process.platform}`);
		}

		browser = await puppeteer.launch({
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
			executablePath,
			headless: true
		});
	} else {
		browser = await puppeteer.launch({
			args: chromium.args,
			defaultViewport: VIEWPORT,
			executablePath: await chromium.executablePath(),
			headless: true
		});
	}

	return browser;
}

async function takeScreenshot(html: string): Promise<Buffer> {
	const activeBrowser = await getBrowser();
	const page: Page = await activeBrowser.newPage();

	try {
		await page.setViewport(VIEWPORT);
		await page.setContent(html, { waitUntil: 'load' });
		await page.evaluate(async () => {
			if (document.fonts?.ready) {
				await document.fonts.ready;
			}

			const images = Array.from(document.images);
			await Promise.all(
				images.map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise<void>((resolve) => {
						img.addEventListener('load', () => resolve(), { once: true });
						img.addEventListener('error', () => resolve(), { once: true });
					});
				})
			);
		});

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

export function getScreenshot(html: string): Promise<Buffer> {
	const run = () =>
		takeScreenshot(html).catch(async (error) => {
			await resetBrowser();
			throw error;
		});

	const result = renderQueue.then(run, run);
	renderQueue = result.then(
		() => undefined,
		() => undefined
	);

	return result;
}
