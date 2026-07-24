/**
 * SVGs that ship with width/height="1em" render tiny as <img>.
 * Only rewrite those dimensions — never crop the viewBox (that clips logos).
 */
export async function normalizeLogoUrl(
	url: string,
	width: number,
	height: number
): Promise<string> {
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(5000),
			cache: 'no-store'
		});

		if (!response.ok) {
			return url;
		}

		const contentType = response.headers.get('content-type') || '';
		const body = await response.text();
		const isSvg =
			contentType.includes('image/svg') ||
			body.trimStart().toLowerCase().startsWith('<svg');

		if (!isSvg) {
			return url;
		}

		const needsSizeFix = /(?:width|height)\s*=\s*["'][^"']*em["']/i.test(body);
		if (!needsSizeFix) {
			// Already has real dimensions — leave the file alone to avoid clipping
			return url;
		}

		let svg = body;

		if (/\swidth\s*=/.test(svg)) {
			svg = svg.replace(/\swidth\s*=\s*["'][^"']*["']/i, ` width="${width}"`);
		} else {
			svg = svg.replace(/<svg\b/i, `<svg width="${width}"`);
		}

		if (/\sheight\s*=/.test(svg)) {
			svg = svg.replace(/\sheight\s*=\s*["'][^"']*["']/i, ` height="${height}"`);
		} else {
			svg = svg.replace(/<svg\b/i, `<svg height="${height}"`);
		}

		return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
	} catch {
		return url;
	}
}

export async function normalizeLogoUrls(
	urls: string[],
	width: number,
	height: number
): Promise<string[]> {
	return Promise.all(urls.map((url) => normalizeLogoUrl(url, width, height)));
}
