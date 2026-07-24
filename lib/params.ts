export interface ThumbnailParams {
	title: string;
	bg: string;
	images: string[];
	fontSize: number;
	logoHeight: number;
	logoWidth: number | 'auto';
}

const SIZE_MIN = 16;
const SIZE_MAX = 800;
// Old: font 100 / logo 225 on 2048×1170. Keep font at 64; preserve logo:font ratio.
const DEFAULT_LOGO_HEIGHT = 144;
const DEFAULT_FONT_SIZE = 64;
const DEFAULT_BG = '#000000';

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getArray(value: string | string[] | null): string[] {
	if (value == null) return [];
	if (Array.isArray(value)) {
		return value.flatMap((item) =>
			item
				.split(',')
				.map((part) => part.trim())
				.filter(Boolean)
		);
	}

	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

function parsePositiveInt(
	value: string | null,
	fallback: number
): number {
	if (value == null || value === '') return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return Math.round(parsed);
}

export function parseThumbnailParams(
	searchParams: URLSearchParams
): ThumbnailParams | { error: string } {
	const title = searchParams.get('title');

	if (!title) {
		return { error: 'Missing title' };
	}

	const logoWidthRaw = searchParams.get('logoWidth');
	let logoWidth: number | 'auto' = 'auto';

	if (logoWidthRaw != null && logoWidthRaw !== '' && logoWidthRaw !== 'auto') {
		logoWidth = clamp(
			parsePositiveInt(logoWidthRaw, DEFAULT_LOGO_HEIGHT),
			SIZE_MIN,
			SIZE_MAX
		);
	}

	const imageParams = searchParams.getAll('images');

	return {
		title,
		bg: searchParams.get('bg') || DEFAULT_BG,
		images: getArray(
			imageParams.length > 0 ? imageParams : searchParams.get('images')
		),
		fontSize: clamp(
			parsePositiveInt(searchParams.get('fontSize'), DEFAULT_FONT_SIZE),
			SIZE_MIN,
			SIZE_MAX
		),
		logoHeight: clamp(
			parsePositiveInt(searchParams.get('logoHeight'), DEFAULT_LOGO_HEIGHT),
			SIZE_MIN,
			SIZE_MAX
		),
		logoWidth
	};
}

/** Stable cache key so param order / formatting does not fragment the cache. */
export function thumbnailCacheKey(params: ThumbnailParams): string {
	return JSON.stringify({
		title: params.title,
		bg: params.bg.toLowerCase(),
		// Preserve order — logo sequence is part of the image
		images: params.images,
		fontSize: params.fontSize,
		logoHeight: params.logoHeight,
		logoWidth: params.logoWidth
	});
}
