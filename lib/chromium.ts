import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const isDev = process.env.NODE_ENV === 'development';

const chromeExecPaths: Record<string, string> = {
	win32: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	linux: '/usr/bin/google-chrome',
	darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
};

const VIEWPORT = { width: 1200, height: 630 };
const IMAGE_WAIT_MS = 4000;

let browser: Browser | null = null;

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

export async function getScreenshot(html: string): Promise<Buffer> {
	const activeBrowser = await getBrowser();
	const page: Page = await activeBrowser.newPage();

	try {
		await page.setViewport(VIEWPORT);
		await page.setContent(html, { waitUntil: 'domcontentloaded' });

		await page.evaluate(async (waitMs) => {
			const deadline = Date.now() + waitMs;

			if (document.fonts?.ready) {
				await Promise.race([
					document.fonts.ready,
					new Promise<void>((resolve) => setTimeout(resolve, 1500))
				]);
			}

			const images = Array.from(document.images);
			await Promise.all(
				images.map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise<void>((resolve) => {
						const remaining = Math.max(250, deadline - Date.now());
						const timer = setTimeout(() => resolve(), remaining);
						const done = () => {
							clearTimeout(timer);
							resolve();
						};
						img.addEventListener('load', done, { once: true });
						img.addEventListener('error', done, { once: true });
					});
				})
			);
		}, IMAGE_WAIT_MS);

		const file = await page.screenshot({ type: 'png' });
		return Buffer.from(file);
	} catch (error) {
		await resetBrowser();
		throw error;
	} finally {
		try {
			if (!page.isClosed()) await page.close();
		} catch {
			// ignore
		}
	}
}
