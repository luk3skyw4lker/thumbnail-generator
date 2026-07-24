/**
 * SVGs often ship with width/height="1em" and padded viewBoxes (especially
 * icon sets). Rewrite dimensions, zoom the viewBox, and embed as a data URI.
 */
export async function normalizeLogoUrl(
	url: string,
	width: number,
	height: number
): Promise<string> {
	try {
		const response = await fetch(url, {
			signal: AbortSignal.timeout(8000),
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

		let svg = body;

		if (/\swidth\s*=/.test(svg)) {
			svg = svg.replace(/\swidth\s*=\s*"[^"]*"/i, ` width="${width}"`);
		} else {
			svg = svg.replace(/<svg\b/i, `<svg width="${width}"`);
		}

		if (/\sheight\s*=/.test(svg)) {
			svg = svg.replace(/\sheight\s*=\s*"[^"]*"/i, ` height="${height}"`);
		} else {
			svg = svg.replace(/<svg\b/i, `<svg height="${height}"`);
		}

		const viewBoxMatch = svg.match(/viewBox\s*=\s*"([^"]+)"/i);
		if (viewBoxMatch) {
			const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
			if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
				const [minX, minY, vw, vh] = parts;
				const inset = 0.04;
				const nx = minX + vw * inset;
				const ny = minY + vh * inset;
				const nw = vw * (1 - 2 * inset);
				const nh = vh * (1 - 2 * inset);
				svg = svg.replace(
					/viewBox\s*=\s*"[^"]*"/i,
					`viewBox="${nx} ${ny} ${nw} ${nh}"`
				);
			}
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
