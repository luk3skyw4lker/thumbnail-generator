/**
 * Changes on every Vercel deploy. Used for in-memory cache isolation and
 * optional CDN busting via the `v` query param / /api/cache-version.
 */
export const CACHE_VERSION =
	process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
	process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 12) ||
	process.env.npm_package_version ||
	'dev';
