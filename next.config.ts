import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
	outputFileTracingIncludes: {
		'/api/thumbnail': ['./node_modules/@sparticuz/chromium/bin/**']
	},
	// Do NOT set Cache-Control here — it overrides the route's nocache/bypass headers
	// and was causing stale immutable PNGs while fresh requests 500'd.
	async rewrites() {
		return [
			{
				source: '/api/thumbnail.png',
				destination: '/api/thumbnail'
			}
		];
	}
};

export default nextConfig;
