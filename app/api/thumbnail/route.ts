import { getScreenshot } from '@/lib/chromium';
import {
	deleteCachedThumbnail,
	getOrCreateThumbnail,
	setCachedThumbnail
} from '@/lib/cache';
import { prepareLogoUrls } from '@/lib/logos';
import { parseThumbnailParams, thumbnailCacheKey } from '@/lib/params';
import { getThumbnailTemplate } from '@/lib/thumb-template';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function shouldBypassCache(request: Request, nocache: boolean) {
	if (nocache) return true;
	if (process.env.THUMBNAIL_NO_CACHE === '1') return true;
	if (process.env.NODE_ENV === 'development') return true;

	const host = new URL(request.url).hostname;
	return host === 'localhost' || host === '127.0.0.1';
}

function cacheHeaders(bypass: boolean): Record<string, string> {
	if (bypass) {
		return {
			'Content-Type': 'image/png',
			'Cache-Control':
				'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
			Pragma: 'no-cache',
			Expires: '0',
			'CDN-Cache-Control': 'no-store',
			'Vercel-CDN-Cache-Control': 'no-store'
		};
	}

	return {
		'Content-Type': 'image/png',
		'Cache-Control':
			'public, immutable, no-transform, s-maxage=31536000, max-age=31536000, stale-while-revalidate=86400'
	};
}

async function renderThumbnail(parsed: {
	title: string;
	bg: string;
	images: string[];
	fontSize: number;
	logoHeight: number;
	logoWidth: number | 'auto';
}) {
	const logoWidth =
		parsed.logoWidth === 'auto' ? parsed.logoHeight : parsed.logoWidth;
	const images = prepareLogoUrls(parsed.images, logoWidth, parsed.logoHeight);

	const html = getThumbnailTemplate({
		title: parsed.title,
		thumbnail_bg: parsed.bg,
		images,
		fontSize: parsed.fontSize,
		logoHeight: parsed.logoHeight,
		logoWidth: parsed.logoWidth
	});

	return getScreenshot(html);
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = parseThumbnailParams(searchParams);

		if ('error' in parsed) {
			return Response.json({ err: parsed.error }, { status: 400 });
		}

		const bypass = shouldBypassCache(request, parsed.nocache);
		const cacheKey = thumbnailCacheKey(parsed);

		if (bypass) {
			deleteCachedThumbnail(cacheKey);
			const buffer = await renderThumbnail(parsed);
			setCachedThumbnail(cacheKey, buffer);

			return new Response(new Uint8Array(buffer), {
				headers: {
					...cacheHeaders(true),
					'X-Cache': 'BYPASS'
				}
			});
		}

		const { buffer, cacheStatus } = await getOrCreateThumbnail(cacheKey, () =>
			renderThumbnail(parsed)
		);

		return new Response(new Uint8Array(buffer), {
			headers: {
				...cacheHeaders(false),
				'X-Cache': cacheStatus
			}
		});
	} catch (error) {
		console.error(error);
		return new Response('Internal error', { status: 500 });
	}
}
