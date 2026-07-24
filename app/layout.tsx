import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
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
		<html lang="en" className={`${display.variable} ${body.variable}`}>
			<body>{children}</body>
		</html>
	);
}
