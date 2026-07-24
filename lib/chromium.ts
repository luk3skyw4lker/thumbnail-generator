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
let page: Page | null = null;

/** One render at a time on the shared page (same model as the original app). */
let renderLock: Promise<unknown> = Promise.resolve();

async function resetBrowser() {
	page = null;
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
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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

async function getPage(): Promise<Page> {
	const activeBrowser = await getBrowser();

	if (page && !page.isClosed()) {
		return page;
	}

	page = await activeBrowser.newPage();
	await page.setViewport(VIEWPORT);
	return page;
}

async function takeScreenshot(html: string): Promise<Buffer> {
	const activePage = await getPage();

	// Match the original path: set content, then screenshot.
	// A short image wait avoids blank logos without multi-second stalls.
	await activePage.setContent(html, { waitUntil: 'load' });
	await activePage.evaluate(async () => {
		const images = Array.from(document.images);
		await Promise.race([
			Promise.all(
				images.map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise<void>((resolve) => {
						img.addEventListener('load', () => resolve(), { once: true });
						img.addEventListener('error', () => resolve(), { once: true });
					});
				})
			),
			new Promise<void>((resolve) => setTimeout(resolve, 1500))
		]);
	});

	const file = await activePage.screenshot({ type: 'png' });
	return Buffer.from(file);
}

export function getScreenshot(html: string): Promise<Buffer> {
	const run = () =>
		takeScreenshot(html).catch(async (error) => {
			await resetBrowser();
			throw error;
		});

	const result = renderLock.then(run, run);
	renderLock = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}
