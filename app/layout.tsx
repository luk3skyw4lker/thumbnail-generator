import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Manrope } from 'next/font/google';
import './globals.css';

const display = Fraunces({
	subsets: ['latin'],
	variable: '--font-display',
	display: 'swap'
});

const body = Manrope({
	subsets: ['latin'],
	variable: '--font-body',
	display: 'swap'
});

const mono = IBM_Plex_Mono({
	subsets: ['latin'],
	weight: ['400', '500'],
	variable: '--font-mono',
	display: 'swap'
});

export const metadata: Metadata = {
	title: 'Thumbnail Generator',
	description:
		'Serverless PNG thumbnails and OG images from a simple query-string API.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${display.variable} ${body.variable} ${mono.variable}`}
		>
			<body>{children}</body>
		</html>
	);
}
