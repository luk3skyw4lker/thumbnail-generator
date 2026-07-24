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
let browserLaunch: Promise<Browser> | null = null;

/** Fluid packs concurrent requests onto one instance — never race Chromium. */
let renderChain: Promise<unknown> = Promise.resolve();

async function closeQuietly(target: { close: () => Promise<void> } | null | undefined) {
	if (!target) return;
	try {
		await target.close();
	} catch {
		// ignore
	}
}

async function resetPage() {
	await closeQuietly(page && !page.isClosed() ? page : null);
	page = null;
}

async function resetBrowser() {
	await resetPage();
	await closeQuietly(browser);
	browser = null;
	browserLaunch = null;
}

async function launchBrowser(): Promise<Browser> {
	if (isDev) {
		const executablePath = chromeExecPaths[process.platform];
		if (!executablePath) {
			throw new Error(`Unsupported platform for local Chrome: ${process.platform}`);
		}

		return puppeteer.launch({
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
			executablePath,
			headless: true,
			defaultViewport: VIEWPORT
		});
	}

	chromium.setGraphicsMode = false;

	return puppeteer.launch({
		args: [...chromium.args, '--disable-dev-shm-usage'],
		defaultViewport: VIEWPORT,
		executablePath: await chromium.executablePath(),
		headless: true
	});
}

async function getBrowser(): Promise<Browser> {
	if (browser?.connected) {
		return browser;
	}

	if (!browserLaunch) {
		browserLaunch = launchBrowser()
			.then((launched) => {
				browser = launched;
				launched.on('disconnected', () => {
					browser = null;
					page = null;
					browserLaunch = null;
				});
				return launched;
			})
			.catch((error) => {
				browserLaunch = null;
				browser = null;
				throw error;
			});
	}

	return browserLaunch;
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

async function takeScreenshotOnce(html: string): Promise<Buffer> {
	const activePage = await getPage();
	await activePage.setContent(html);
	const file = await activePage.screenshot({ type: 'png' });
	return Buffer.from(file);
}

async function takeScreenshot(html: string): Promise<Buffer> {
	try {
		return await takeScreenshotOnce(html);
	} catch (error) {
		console.error('Screenshot failed, retrying with fresh page:', error);
		await resetPage();

		if (!browser?.connected) {
			await resetBrowser();
		}

		try {
			return await takeScreenshotOnce(html);
		} catch (retryError) {
			await resetBrowser();
			throw retryError;
		}
	}
}

export function getScreenshot(html: string): Promise<Buffer> {
	const run = () => takeScreenshot(html);
	const result = renderChain.then(run, run);
	// Keep the queue alive even when a job fails
	renderChain = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}
