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

/** Only one Chromium extract/launch at a time (concurrent cold starts corrupt /tmp). */
let browserLaunch: Promise<Browser> | null = null;

/** Serialize screenshots so a shared page never races. */
let renderChain: Promise<unknown> = Promise.resolve();

async function closeQuietly(target: { close: () => Promise<void> } | null) {
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
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu'
			],
			executablePath,
			headless: true,
			defaultViewport: VIEWPORT
		});
	}

	// Avoid WebGL/swiftshader extract cost and memory pressure under load
	chromium.setGraphicsMode = false;

	return puppeteer.launch({
		args: [...chromium.args, '--disable-gpu', '--disable-dev-shm-usage'],
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
				browser.on('disconnected', () => {
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
	page.setDefaultNavigationTimeout(20_000);
	page.setDefaultTimeout(20_000);
	await page.setViewport(VIEWPORT);
	return page;
}

async function takeScreenshotOnce(html: string): Promise<Buffer> {
	const activePage = await getPage();

	await activePage.setContent(html, {
		waitUntil: 'domcontentloaded',
		timeout: 20_000
	});

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
			new Promise<void>((resolve) => setTimeout(resolve, 2000))
		]);
	});

	const file = await activePage.screenshot({ type: 'png', captureBeyondViewport: false });
	return Buffer.from(file);
}

async function takeScreenshot(html: string): Promise<Buffer> {
	try {
		return await takeScreenshotOnce(html);
	} catch (firstError) {
		console.error('Screenshot failed, retrying with fresh page:', firstError);
		// Drop the page first — keep the browser if it's still alive
		await resetPage();

		if (!browser?.connected) {
			await resetBrowser();
		}

		try {
			return await takeScreenshotOnce(html);
		} catch (secondError) {
			console.error('Screenshot retry failed, resetting browser:', secondError);
			await resetBrowser();
			throw secondError;
		}
	}
}

export function getScreenshot(html: string): Promise<Buffer> {
	const run = () => takeScreenshot(html);

	// Always continue the chain so one failure doesn't poison later jobs
	const result = renderChain.then(run, run);
	renderChain = result.then(
		() => undefined,
		() => undefined
	);
	return result;
}
