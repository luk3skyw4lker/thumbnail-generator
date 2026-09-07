'use client';

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type CSSProperties
} from 'react';
import Link from 'next/link';
import styles from './icons.module.css';

const PAGE_SIZE = 60;
const PREVIEW_SIZE = 48;
const REQUEST_TIMEOUT_MS = 15000;

interface CollectionSummary {
	prefix: string;
	total: number;
}

interface IconItem {
	id: string;
	svg: string;
}

interface SearchResponse {
	items: IconItem[];
	total: number;
	collections: CollectionSummary[];
}

function IconCard({
	item,
	onCopy,
	copied
}: {
	item: IconItem;
	onCopy: (id: string) => void;
	copied: boolean;
}) {
	return (
		<button
			type="button"
			className={styles.card}
			onClick={() => onCopy(item.id)}
			title={`Copy "${item.id}"`}
		>
			{/* Markup comes from icon sets bundled at build time, never from
			    user input. Inlining it keeps a 60-icon grid at one request. */}
			<span
				className={styles.cardArt}
				dangerouslySetInnerHTML={{ __html: item.svg }}
			/>
			<span className={styles.cardName}>{item.id}</span>
			<span className={styles.cardHint}>{copied ? 'Copied' : 'Copy'}</span>
		</button>
	);
}

export default function IconsPage() {
	const [query, setQuery] = useState('');
	const [collection, setCollection] = useState('all');
	const [color, setColor] = useState('#e8f0ea');

	const [items, setItems] = useState<IconItem[]>([]);
	const [total, setTotal] = useState(0);
	const [collections, setCollections] = useState<CollectionSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState<string | null>(null);

	// Page resets on every filter change, so it is part of the fetch key.
	const [page, setPage] = useState(0);

	const requestId = useRef(0);

	useEffect(() => {
		setPage(0);
	}, [query, collection]);

	useEffect(() => {
		const id = ++requestId.current;
		const controller = new AbortController();
		// A request that never settles used to leave the page on
		// “Searching…” forever with no way to tell what went wrong.
		const timeout = setTimeout(
			() => controller.abort(),
			REQUEST_TIMEOUT_MS
		);
		// Debounce keystrokes; filter/page changes are deliberate, but the
		// extra tick costs nothing and keeps one code path.
		const timer = setTimeout(async () => {
			setLoading(true);

			try {
				const params = new URLSearchParams({
					q: query,
					collection,
					limit: String(PAGE_SIZE),
					offset: String(page * PAGE_SIZE),
					previewHeight: String(PREVIEW_SIZE)
				});

				const response = await fetch(`/api/icons?${params.toString()}`, {
					signal: controller.signal
				});

				if (!response.ok) throw new Error(`Search failed (${response.status})`);

				const data: SearchResponse = await response.json();

				// A slower earlier request must not overwrite a newer result.
				if (id !== requestId.current) return;

				setItems(data.items);
				setTotal(data.total);
				setCollections(data.collections);
				setError(null);
			} catch (cause) {
				if (id !== requestId.current) return;
				// Superseded by a newer keystroke — that request owns the UI now.
				if (controller.signal.aborted) {
					setError('Search timed out. Try a narrower query.');
					return;
				}
				setError(cause instanceof Error ? cause.message : 'Search failed');
			} finally {
				clearTimeout(timeout);
				if (id === requestId.current) setLoading(false);
			}
		}, 180);

		return () => {
			clearTimeout(timer);
			clearTimeout(timeout);
			controller.abort();
		};
	}, [query, collection, page]);

	const copy = useCallback(async (id: string) => {
		await navigator.clipboard.writeText(id);
		setCopied(id);
		setTimeout(() => setCopied(null), 1400);
	}, []);

	const pageCount = Math.ceil(total / PAGE_SIZE);
	const grandTotal = collections.reduce((sum, item) => sum + item.total, 0);

	return (
		<main className={styles.page}>
			<div className={styles.atmosphere} aria-hidden="true" />

			<div className={styles.shell}>
				<header className={styles.header}>
					<Link href="/" className={styles.back}>
						← Thumbnail Generator
					</Link>
					<h1 className={styles.title}>Icon catalog</h1>
					<p className={styles.lede}>
						{grandTotal > 0
							? `${grandTotal.toLocaleString()} icons bundled in this deploy.`
							: 'Icons bundled in this deploy.'}{' '}
						Click any icon to copy its name, then pass it as{' '}
						<code>icons=</code> on <code>/api/thumbnail.png</code>. Nothing
						here is fetched from an external CDN.
					</p>
				</header>

				<div className={styles.controls}>
					<input
						className={styles.search}
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search icons — react, docker, arrow…"
						aria-label="Search icons"
						autoFocus
					/>

					<label className={styles.colorControl}>
						<span>Preview color</span>
						<input
							type="color"
							value={color}
							onChange={(event) => setColor(event.target.value)}
							aria-label="Preview color for monochrome icons"
						/>
					</label>
				</div>

				<div className={styles.filters} role="group" aria-label="Collections">
					<button
						type="button"
						className={collection === 'all' ? styles.chipActive : styles.chip}
						onClick={() => setCollection('all')}
					>
						All
					</button>
					{collections.map(({ prefix, total: count }) => (
						<button
							key={prefix}
							type="button"
							className={
								collection === prefix ? styles.chipActive : styles.chip
							}
							onClick={() => setCollection(prefix)}
						>
							{prefix}
							<span className={styles.chipCount}>{count}</span>
						</button>
					))}
				</div>

				<p className={styles.status} aria-live="polite">
					{error
						? error
						: loading
							? 'Searching…'
							: total === 0
								? `No icons match “${query}”.`
								: `${total.toLocaleString()} result${total === 1 ? '' : 's'}${
										pageCount > 1 ? ` · page ${page + 1} of ${pageCount}` : ''
									}`}
				</p>

				{/* Monochrome bodies use currentColor, so this one property
				    recolors every preview without refetching anything. */}
				<div
					className={styles.grid}
					style={{ '--preview-color': color } as CSSProperties}
				>
					{items.map((item) => (
						<IconCard
							key={item.id}
							item={item}
							onCopy={copy}
							copied={copied === item.id}
						/>
					))}
				</div>

				{pageCount > 1 && (
					<nav className={styles.pager} aria-label="Pagination">
						<button
							type="button"
							className={styles.pagerBtn}
							onClick={() => setPage((current) => Math.max(0, current - 1))}
							disabled={page === 0}
						>
							← Previous
						</button>
						<span className={styles.pagerLabel}>
							{page + 1} / {pageCount}
						</span>
						<button
							type="button"
							className={styles.pagerBtn}
							onClick={() =>
								setPage((current) => Math.min(pageCount - 1, current + 1))
							}
							disabled={page >= pageCount - 1}
						>
							Next →
						</button>
					</nav>
				)}
			</div>
		</main>
	);
}
