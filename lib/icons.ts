import type { IconifyJSON } from '@iconify/types';
import {
	getIconData,
	iconToHTML,
	iconToSVG,
	replaceIDs,
	stringToIcon
} from '@iconify/utils';

/**
 * Iconify icon sets bundled into the deploy.
 *
 * Rendering used to point <img src> at api.iconify.design and let Chromium
 * fetch it. Their edge started blocking those requests (headless UA / no
 * referrer), which silently produced logo-less thumbnails. Everything is
 * resolved locally now — the render does zero network I/O.
 *
 * Adding a set: `yarn add @iconify-json/<prefix>` + one line here.
 * Keep this a literal map of dynamic imports so Next traces the JSON into
 * the serverless bundle (a computed specifier is not traced).
 */
const COLLECTIONS: Record<string, () => Promise<{ icons: IconifyJSON }>> = {
	logos: () => import('@iconify-json/logos'),
	'simple-icons': () => import('@iconify-json/simple-icons'),
	devicon: () => import('@iconify-json/devicon'),
	'skill-icons': () => import('@iconify-json/skill-icons'),
	lucide: () => import('@iconify-json/lucide'),
	mdi: () => import('@iconify-json/mdi'),
	tabler: () => import('@iconify-json/tabler')
};

/** Shorthands accepted in the URL so names stay short. */
const PREFIX_ALIASES: Record<string, string> = {
	si: 'simple-icons',
	simple: 'simple-icons',
	skill: 'skill-icons',
	skills: 'skill-icons',
	dev: 'devicon',
	devicons: 'devicon'
};

/** Used when the name carries no prefix (`icons=react`). */
const DEFAULT_PREFIX = 'logos';

export const AVAILABLE_COLLECTIONS = Object.keys(COLLECTIONS);

const loaded = new Map<string, Promise<IconifyJSON>>();

function loadCollection(prefix: string): Promise<IconifyJSON> | null {
	const load = COLLECTIONS[prefix];
	if (!load) return null;

	let pending = loaded.get(prefix);
	if (!pending) {
		pending = load().then((mod) => mod.icons);
		loaded.set(prefix, pending);
	}

	return pending;
}

export interface IconRequest {
	prefix: string;
	name: string;
}

/**
 * Accepts `logos:react`, `logos--react` (Iconify CSS class form) and bare
 * `react`. Returns null for anything that is not a valid icon reference —
 * callers must not fall back to treating it as a URL.
 */
export function parseIconName(raw: string): IconRequest | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	const normalized = trimmed.includes(':')
		? trimmed
		: trimmed.replace('--', ':');

	const parsed = stringToIcon(normalized, false, false);
	if (!parsed) {
		// Bare name with no separator at all → default collection.
		if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
			return { prefix: DEFAULT_PREFIX, name: normalized };
		}
		return null;
	}

	const prefix = parsed.prefix || DEFAULT_PREFIX;
	return { prefix: PREFIX_ALIASES[prefix] ?? prefix, name: parsed.name };
}

export interface RenderIconOptions {
	height: number;
	width: number | 'auto';
	/** Applied as `color` so monochrome sets (currentColor) are visible. */
	color?: string;
}

export class IconNotFoundError extends Error {
	constructor(public readonly requested: string, message: string) {
		super(message);
		this.name = 'IconNotFoundError';
	}
}

/** Resolve one icon to a standalone, inline-safe `<svg>` string. */
export async function renderIcon(
	raw: string,
	{ height, width, color }: RenderIconOptions
): Promise<string> {
	const request = parseIconName(raw);

	if (!request) {
		throw new IconNotFoundError(raw, `Invalid icon name "${raw}"`);
	}

	const collection = loadCollection(request.prefix);

	if (!collection) {
		throw new IconNotFoundError(
			raw,
			`Unknown icon collection "${request.prefix}". Available: ${AVAILABLE_COLLECTIONS.join(', ')}`
		);
	}

	const iconSet = await collection;
	const data = getIconData(iconSet, request.name);

	if (!data) {
		throw new IconNotFoundError(
			raw,
			`Icon "${request.name}" not found in collection "${request.prefix}"`
		);
	}

	// iconToSVG dereferences whatever key is present, so an explicit
	// `width: undefined` throws — omit it entirely to keep the aspect ratio.
	const rendered = iconToSVG(data, {
		height: String(height),
		...(width === 'auto' ? {} : { width: String(width) })
	});

	const attributes: Record<string, string> = {
		...rendered.attributes,
		class: 'logo',
		'aria-hidden': 'true'
	};

	if (color) {
		attributes.style = `color:${color}`;
	}

	// Icon bodies can share element ids (gradients, clip paths). Inlining
	// several unmodified ones in the same document makes them collide.
	return iconToHTML(replaceIDs(rendered.body), attributes);
}

export async function renderIcons(
	names: string[],
	options: RenderIconOptions
): Promise<string[]> {
	return Promise.all(names.map((name) => renderIcon(name, options)));
}

/** Name index per collection, built once and reused for every search. */
const nameIndex = new Map<string, Promise<string[]>>();

function listNames(prefix: string): Promise<string[]> | null {
	const collection = loadCollection(prefix);
	if (!collection) return null;

	let pending = nameIndex.get(prefix);

	if (!pending) {
		pending = collection.then((iconSet) => {
			const names = [
				...Object.entries(iconSet.icons)
					.filter(([, icon]) => !icon.hidden)
					.map(([name]) => name),
				...Object.entries(iconSet.aliases ?? {})
					.filter(([, alias]) => !alias.hidden)
					.map(([name]) => name)
			];

			return names.sort();
		});

		nameIndex.set(prefix, pending);
	}

	return pending;
}

export interface CollectionSummary {
	prefix: string;
	total: number;
}

export async function listCollections(): Promise<CollectionSummary[]> {
	return Promise.all(
		AVAILABLE_COLLECTIONS.map(async (prefix) => ({
			prefix,
			total: (await listNames(prefix))!.length
		}))
	);
}

export interface IconSearchItem {
	id: string;
	/** Inline `<svg>` markup, so a result grid costs one request, not N. */
	svg: string;
}

export interface IconSearchResult {
	items: IconSearchItem[];
	total: number;
}

/**
 * Substring match over icon names. Results are ranked so exact and
 * prefix matches come first — searching "react" should not bury
 * `logos:react` under `logos:react-router`.
 */
export async function searchIcons({
	query,
	collection,
	limit,
	offset = 0,
	previewHeight
}: {
	query: string;
	collection?: string;
	limit: number;
	offset?: number;
	/** Height for the inline preview markup returned with each result. */
	previewHeight: number;
}): Promise<IconSearchResult> {
	const prefixes =
		collection && collection !== 'all'
			? AVAILABLE_COLLECTIONS.filter((prefix) => prefix === collection)
			: AVAILABLE_COLLECTIONS;

	const needle = query.trim().toLowerCase();
	const matches: { id: string; rank: number }[] = [];

	for (const prefix of prefixes) {
		const names = await listNames(prefix);
		if (!names) continue;

		for (const name of names) {
			if (!needle) {
				matches.push({ id: `${prefix}:${name}`, rank: 2 });
				continue;
			}

			const at = name.indexOf(needle);
			if (at === -1) continue;

			matches.push({
				id: `${prefix}:${name}`,
				rank: name === needle ? 0 : at === 0 ? 1 : 2
			});
		}
	}

	matches.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

	const page = matches.slice(offset, offset + limit);

	// No `color` — monochrome bodies keep `currentColor`, so the client can
	// recolor previews with CSS instead of refetching them.
	const items = await Promise.all(
		page.map(async ({ id }) => ({
			id,
			svg: await renderIcon(id, { height: previewHeight, width: 'auto' })
		}))
	);

	return { items, total: matches.length };
}
