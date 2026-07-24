'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

const EXAMPLE_PATH =
	'/api/thumbnail.png?title=Hoisting%20in%20**Javascript**&bg=%23121214&images=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2F6%2F6a%2FJavaScript-logo.png';

const IMG_SNIPPET = `<img
  src="https://your-domain.com/api/thumbnail.png?title=Hello%20World&images=https://example.com/logo.svg&logoHeight=180"
  alt="Hello World"
  width="1200"
  height="630"
/>`;

export default function HomePage() {
	const [copied, setCopied] = useState(false);
	const [exampleUrl, setExampleUrl] = useState(EXAMPLE_PATH);
	const [previewSrc, setPreviewSrc] = useState(EXAMPLE_PATH);
	const [cacheVersion, setCacheVersion] = useState('…');
	const [versionUrl, setVersionUrl] = useState('/api/cache-version');

	useEffect(() => {
		const origin = window.location.origin;
		setExampleUrl(`${origin}${EXAMPLE_PATH}`);
		setVersionUrl(`${origin}/api/cache-version`);
		// Bust browser disk cache from earlier immutable responses
		setPreviewSrc(`${EXAMPLE_PATH}&_=${Date.now()}`);

		fetch('/api/cache-version')
			.then((res) => res.json())
			.then((data: { version?: string }) => {
				if (data.version) setCacheVersion(data.version);
			})
			.catch(() => setCacheVersion('unknown'));
	}, []);

	async function copyExample() {
		const value = `${window.location.origin}${EXAMPLE_PATH}`;
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	return (
		<main className={styles.page}>
			<div className={styles.atmosphere} aria-hidden />

			<section className={styles.hero}>
				<h1 className={styles.brand}>Thumbnail Generator</h1>
				<p className={styles.tagline}>
					Turn a title, background, and logos into a cached PNG — ready for
					blog posts and Open Graph cards.
				</p>
				<div className={styles.ctaRow}>
					<button type="button" className={styles.cta} onClick={copyExample}>
						{copied ? 'Copied example URL' : 'Copy example URL'}
					</button>
					<a className={styles.ctaSecondary} href="#docs">
						Read the API
					</a>
				</div>
			</section>

			<section id="docs" className={styles.docs}>
				<h2>How it works</h2>
				<p>
					Hit the endpoint with query params. Responses are CDN-cached for a
					year; identical params reuse an in-memory cache on warm instances.
					See <a href="#caching">Caching</a> for deploy busting with{' '}
					<code>v</code>.
				</p>

				<div className={styles.preview}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={previewSrc}
						alt="Example generated thumbnail for Hoisting in Javascript"
						width={1200}
						height={630}
					/>
				</div>

				<p className={styles.sectionLabel}>Query parameters</p>
				<table className={styles.params}>
					<thead>
						<tr>
							<th>Param</th>
							<th>Required</th>
							<th>Default</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td data-label="Param">
								<code>title</code>
							</td>
							<td data-label="Required">yes</td>
							<td data-label="Default">—</td>
							<td data-label="Description">
								Thumbnail heading. Supports markdown (parsed server-side).
							</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>bg</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">
								<code>#000000</code>
							</td>
							<td data-label="Description">Background color hex.</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>images</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">
								<code>[]</code>
							</td>
							<td data-label="Description">
								Logo URL(s). Repeat the param or comma-separate.
							</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>fontSize</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">
								<code>64</code>
							</td>
							<td data-label="Description">Heading font size in px (16–800).</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>logoHeight</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">
								<code>144</code>
							</td>
							<td data-label="Description">Logo height in px (16–800).</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>logoWidth</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">
								<code>auto</code>
							</td>
							<td data-label="Description">
								Logo width in px, or <code>auto</code> to keep aspect ratio.
							</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>nocache</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">—</td>
							<td data-label="Description">
								Set to <code>1</code> to force a fresh render and skip
								browser/CDN caching. Aliases: <code>refresh=1</code>,{' '}
								<code>_=&lt;token&gt;</code>.
							</td>
						</tr>
						<tr>
							<td data-label="Param">
								<code>v</code>
							</td>
							<td data-label="Required">no</td>
							<td data-label="Default">—</td>
							<td data-label="Description">
								Cache-bust token (does not change pixels). Use the value from{' '}
								<code>/api/cache-version</code> after generator deploys.
							</td>
						</tr>
					</tbody>
				</table>

				<p className={styles.sectionLabel}>Example URL</p>
				<pre className={styles.example}>{exampleUrl}</pre>

				<p className={styles.sectionLabel}>Example usage</p>
				<pre className={styles.example}>{IMG_SNIPPET}</pre>

				<h2 id="caching" className={styles.subheading}>
					Caching
				</h2>
				<p>
					There are two layers. In-memory cache on the server clears on every
					deploy. CDN and browser cache are keyed by URL — same URL stays
					cached until you change it or use <code>nocache</code>.
				</p>

				<table className={styles.params}>
					<thead>
						<tr>
							<th>Layer</th>
							<th>Invalidated on deploy?</th>
							<th>How</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td data-label="Layer">In-memory (server)</td>
							<td data-label="Invalidated on deploy?">Yes</td>
							<td data-label="How">
								New instances + deploy SHA in the cache key
							</td>
						</tr>
						<tr>
							<td data-label="Layer">CDN / browser</td>
							<td data-label="Invalidated on deploy?">No</td>
							<td data-label="How">
								Change the URL (e.g. <code>&amp;v=…</code>) or use{' '}
								<code>nocache=1</code>
							</td>
						</tr>
					</tbody>
				</table>

				<p className={styles.sectionLabel}>
					Bust CDN after a generator deploy
				</p>
				<p>
					Current cache version:{' '}
					<code className={styles.versionBadge}>{cacheVersion}</code>
				</p>
				<pre className={styles.example}>{`GET ${versionUrl}
→ { "version": "${cacheVersion}" }`}</pre>
				<p>
					At blog build time (or runtime), read that version and append it to
					thumbnail URLs. When this service redeploys, <code>version</code>{' '}
					changes → new URLs → CDN miss → fresh thumbs.
				</p>
				<pre className={styles.example}>{`/api/thumbnail.png?title=Hello%20World&v=${cacheVersion}`}</pre>
			</section>
		</main>
	);
}
