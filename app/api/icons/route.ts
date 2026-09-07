import { listCollections, searchIcons } from '@/lib/icons';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const DEFAULT_PREVIEW_HEIGHT = 48;
const MAX_PREVIEW_HEIGHT = 128;

function parseInteger(value: string | null, fallback: number): number {
	if (value == null || value === '') return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return fallback;
	return Math.floor(parsed);
}

/** Backs the catalog page at `/icons`. */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);

	const limit = Math.min(
		MAX_LIMIT,
		Math.max(1, parseInteger(searchParams.get('limit'), DEFAULT_LIMIT))
	);

	try {
		const { items, total } = await searchIcons({
			query: searchParams.get('q') ?? '',
			collection: searchParams.get('collection') ?? undefined,
			limit,
			offset: parseInteger(searchParams.get('offset'), 0),
			previewHeight: Math.min(
				MAX_PREVIEW_HEIGHT,
				Math.max(
					16,
					parseInteger(
						searchParams.get('previewHeight'),
						DEFAULT_PREVIEW_HEIGHT
					)
				)
			)
		});

		return Response.json(
			{ items, total, collections: await listCollections() },
			{
				headers: {
					// Names only change when a collection package is upgraded.
					'Cache-Control': 'public, s-maxage=86400, max-age=300'
				}
			}
		);
	} catch (error) {
		console.error(error);
		return Response.json(
			{ err: 'Internal error' },
			{ status: 500, headers: { 'Cache-Control': 'no-store' } }
		);
	}
}
