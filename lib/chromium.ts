import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const isDev = process.env.NODE_ENV === 'development';

const chromeExecPaths: Record<string, string> = {
	win32: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	linux: '/usr/bin/google-chrome',
	darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
};

const VIEWPORT = { width: 1200, height: 630 };

/**
 * Fluid packs many requests on one 2GB instance.
 * 2 parallel pages drains the burst ~2x faster without the crashes of unbounded concurrency.
 */
const MAX_PARALLEL = 2;

let browser: Browser | null = null;
let browserLaunch: Promise<Browser> | null = null;
let active = 0;
const waiters: Array<() => void> = [];

async function closeQuietly(target: { close: () => Promise<void> } | null | undefined) {
	if (!target) return;
	try {
		await target.close();
	} catch {
		// ignore
	}
}

async function resetBrowser() {
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

async function acquireSlot(): Promise<void> {
	if (active < MAX_PARALLEL) {
		active += 1;
		return;
	}

	await new Promise<void>((resolve) => {
		waiters.push(() => {
			active += 1;
			resolve();
		});
	});
}

function releaseSlot() {
	active = Math.max(0, active - 1);
	const next = waiters.shift();
	if (next) next();
}

async function takeScreenshotOnce(html: string): Promise<Buffer> {
	const activeBrowser = await getBrowser();
	const page: Page = await activeBrowser.newPage();

	try {
		await page.setViewport(VIEWPORT);
		// Faster than full `load` — logos get a short grace period below
		await page.setContent(html, { waitUntil: 'domcontentloaded' });
		await page.evaluate(async () => {
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
		const file = await page.screenshot({ type: 'png' });
		return Buffer.from(file);
	} finally {
		await closeQuietly(page);
	}
}

async function takeScreenshot(html: string): Promise<Buffer> {
	try {
		return await takeScreenshotOnce(html);
	} catch (error) {
		console.error('Screenshot failed, retrying:', error);
		if (!browser?.connected) {
			await resetBrowser();
		}
		return takeScreenshotOnce(html);
	}
}

export async function getScreenshot(html: string): Promise<Buffer> {
	await acquireSlot();
	try {
		return await takeScreenshot(html);
	} finally {
		releaseSlot();
	}
}
