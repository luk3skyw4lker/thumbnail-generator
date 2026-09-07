import { getScreenshot } from '@/lib/chromium';
import { IconNotFoundError, renderIcons } from '@/lib/icons';
import { parseThumbnailParams } from '@/lib/params';
import { getThumbnailTemplate } from '@/lib/thumb-template';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Closest match to the original pages API handler:
 * parse → HTML → screenshot → PNG bytes.
 * No in-memory cache layer. CDN headers still honor nocache.
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = parseThumbnailParams(searchParams);

		if ('error' in parsed) {
			return Response.json({ err: parsed.error }, { status: 400 });
		}

		const bypass =
			parsed.nocache ||
			process.env.THUMBNAIL_NO_CACHE === '1' ||
			process.env.NODE_ENV === 'development' ||
			['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);

		// Resolved from bundled icon sets — no request leaves the renderer.
		const iconMarkup = await renderIcons(parsed.icons, {
			height: parsed.logoHeight,
			width: parsed.logoWidth,
			color: parsed.iconColor
		});

		// Old handler passed query image URLs straight into the template.
		const html = getThumbnailTemplate({
			title: parsed.title,
			thumbnail_bg: parsed.bg,
			images: parsed.images,
			iconMarkup,
			fontSize: parsed.fontSize,
			logoHeight: parsed.logoHeight,
			logoWidth: parsed.logoWidth
		});

		const file = await getScreenshot(html);

		const headers: Record<string, string> = {
			'Content-Type': 'image/png',
			'X-Generated-At': new Date().toISOString()
		};

		if (bypass) {
			headers['Cache-Control'] =
				'private, no-store, no-cache, must-revalidate, max-age=0';
			headers['CDN-Cache-Control'] = 'no-store';
			headers['Vercel-CDN-Cache-Control'] = 'no-store';
			headers['X-Cache'] = 'BYPASS';
		} else {
			headers['Cache-Control'] =
				'public, immutable, no-transform, s-maxage=31536000, max-age=31536000';
			headers['X-Cache'] = 'MISS';
		}

		return new Response(new Uint8Array(file), { headers });
	} catch (error) {
		if (error instanceof IconNotFoundError) {
			return Response.json(
				{ err: error.message },
				{ status: 400, headers: { 'Cache-Control': 'no-store' } }
			);
		}

		console.error(error);
		const message = error instanceof Error ? error.message : 'Internal error';
		return new Response(message, {
			status: 500,
			headers: { 'Cache-Control': 'no-store' }
		});
	}
}
