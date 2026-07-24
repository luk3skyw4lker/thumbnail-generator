import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
	outputFileTracingIncludes: {
		'/api/thumbnail': ['./node_modules/@sparticuz/chromium/bin/**']
	},
	async headers() {
		return [
			{
				source: '/api/thumbnail',
				headers: [
					{
						key: 'Cache-Control',
						value:
							process.env.NODE_ENV === 'development'
								? 'no-store, no-cache, must-revalidate, max-age=0'
								: 'public, immutable, no-transform, s-maxage=31536000, max-age=31536000'
					}
				]
			},
			{
				source: '/api/thumbnail.png',
				headers: [
					{
						key: 'Cache-Control',
						value:
							process.env.NODE_ENV === 'development'
								? 'no-store, no-cache, must-revalidate, max-age=0'
								: 'public, immutable, no-transform, s-maxage=31536000, max-age=31536000'
					}
				]
			}
		];
	},
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
