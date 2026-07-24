import { CACHE_VERSION } from '@/lib/cache-version';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
	return Response.json(
		{
			version: CACHE_VERSION,
			// Clients can append this to thumbnail URLs to bust CDN after our deploys:
			//   /api/thumbnail.png?title=...&v=${version}
			usage: `Add &v=${CACHE_VERSION} to thumbnail URLs after each generator deploy`
		},
		{
			headers: {
				'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
				'X-Cache-Version': CACHE_VERSION
			}
		}
	);
}
