/**
 * Prepare logo URLs for Chromium without a server-side fetch.
 * (Fetching every logo under concurrent load was a major timeout source.)
 *
 * Iconify serves `width="1em"` SVGs by default — pass explicit pixel sizes
 * via query params so <img> sizing works without rewriting the file.
 */
export function prepareLogoUrl(
	url: string,
	width: number,
	height: number
): string {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();

		if (
			host === 'api.iconify.design' ||
			host.endsWith('.iconify.design')
		) {
			parsed.searchParams.set('width', String(width));
			parsed.searchParams.set('height', String(height));
			return parsed.toString();
		}
	} catch {
		// keep original URL
	}

	return url;
}

export function prepareLogoUrls(
	urls: string[],
	width: number,
	height: number
): string[] {
	return urls.map((url) => prepareLogoUrl(url, width, height));
}
