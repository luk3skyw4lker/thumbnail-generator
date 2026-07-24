import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
	outputFileTracingIncludes: {
		'/api/thumbnail': [
			'./node_modules/@sparticuz/chromium/**/*',
			'./node_modules/@sparticuz/chromium/bin/**/*'
		],
		'/api/thumbnail/route': [
			'./node_modules/@sparticuz/chromium/**/*',
			'./node_modules/@sparticuz/chromium/bin/**/*'
		]
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
