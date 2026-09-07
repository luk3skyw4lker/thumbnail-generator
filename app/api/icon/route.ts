import { isSafeColor } from '@/lib/color';
import {
	AVAILABLE_COLLECTIONS,
	IconNotFoundError,
	renderIcon
} from '@/lib/icons';

export const runtime = 'nodejs';

const DEFAULT_SIZE = 225;
const SIZE_MIN = 16;
const SIZE_MAX = 800;
function parseSize(value: string | null, fallback: number): number {
	if (value == null || value === '') return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(parsed)));
}

/**
 * Self-hosted replacement for api.iconify.design.
 *
 * `/api/icon?name=logos:react&height=225` → SVG served from our own deploy,
 * so nothing depends on Iconify's CDN staying reachable.
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const name = searchParams.get('name') ?? searchParams.get('icon');

	if (!name) {
		return Response.json(
			{ err: 'Missing name', collections: AVAILABLE_COLLECTIONS },
			{ status: 400 }
		);
	}

	const height = parseSize(searchParams.get('height'), DEFAULT_SIZE);
	const widthRaw = searchParams.get('width');
	const width =
		widthRaw == null || widthRaw === '' || widthRaw === 'auto'
			? 'auto'
			: parseSize(widthRaw, height);

	const colorRaw = searchParams.get('color');
	const color =
		colorRaw && isSafeColor(colorRaw) ? colorRaw.trim() : undefined;

	try {
		const svg = await renderIcon(name, { height, width, color });

		return new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml; charset=utf-8',
				'Cache-Control':
					'public, immutable, no-transform, s-maxage=31536000, max-age=31536000'
			}
		});
	} catch (error) {
		if (error instanceof IconNotFoundError) {
			return Response.json(
				{ err: error.message },
				{ status: 404, headers: { 'Cache-Control': 'no-store' } }
			);
		}

		console.error(error);
		return Response.json(
			{ err: 'Internal error' },
			{ status: 500, headers: { 'Cache-Control': 'no-store' } }
		);
	}
}
