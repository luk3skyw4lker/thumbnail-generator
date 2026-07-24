export interface ThumbnailParams {
	title: string;
	bg: string;
	images: string[];
	fontSize: number;
	logoHeight: number;
	logoWidth: number | 'auto';
	/** Skip caches for this request (testing / forced refresh). */
	nocache: boolean;
	/**
	 * Optional CDN bust token (e.g. deploy SHA). Does not change pixels —
	 * only differentiates the URL / memory key for caching.
	 */
	v: string | null;
}

const SIZE_MIN = 16;
const SIZE_MAX = 800;
const DEFAULT_LOGO_HEIGHT = 225;
const DEFAULT_FONT_SIZE = 100;
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

function isTruthyFlag(value: string | null): boolean {
	if (value == null) return false;
	const normalized = value.trim().toLowerCase();
	return (
		normalized === '1' ||
		normalized === 'true' ||
		normalized === 'yes'
	);
}

/** `nocache=1`, `refresh=1`, or `_=<token>` forces a fresh render. */
export function wantsNoCache(searchParams: URLSearchParams): boolean {
	if (isTruthyFlag(searchParams.get('nocache'))) return true;
	if (isTruthyFlag(searchParams.get('refresh'))) return true;
	const bust = searchParams.get('_');
	return bust != null && bust !== '';
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
		logoWidth,
		nocache: wantsNoCache(searchParams),
		v: searchParams.get('v')
	};
}

/** Stable cache key so param order / formatting does not fragment the cache. */
export function thumbnailCacheKey(
	params: ThumbnailParams,
	deployVersion: string
): string {
	return JSON.stringify({
		deployVersion,
		title: params.title,
		bg: params.bg.toLowerCase(),
		// Preserve order — logo sequence is part of the image
		images: params.images,
		fontSize: params.fontSize,
		logoHeight: params.logoHeight,
		logoWidth: params.logoWidth,
		// Client-provided bust token (CDN URL differs when this changes)
		v: params.v
		// nocache omitted — does not change the image, only caching behavior
	});
}
