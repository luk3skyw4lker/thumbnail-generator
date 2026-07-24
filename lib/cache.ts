const MAX_ENTRIES = 100;

const cache = new Map<string, Buffer>();
/** Deduplicate concurrent generates for the same key. */
const inflight = new Map<string, Promise<Buffer>>();

export function clearThumbnailCache() {
	cache.clear();
	inflight.clear();
}

export function getCachedThumbnail(key: string): Buffer | undefined {
	const hit = cache.get(key);
	if (!hit) return undefined;

	cache.delete(key);
	cache.set(key, hit);
	return hit;
}

export function setCachedThumbnail(key: string, value: Buffer) {
	if (cache.has(key)) {
		cache.delete(key);
	}

	cache.set(key, value);

	if (cache.size > MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest != null) {
			cache.delete(oldest);
		}
	}
}

export async function getOrCreateThumbnail(
	key: string,
	create: () => Promise<Buffer>
): Promise<{ buffer: Buffer; cacheStatus: 'HIT' | 'MISS' }> {
	const cached = getCachedThumbnail(key);
	if (cached) {
		return { buffer: cached, cacheStatus: 'HIT' };
	}

	const pending = inflight.get(key);
	if (pending) {
		const buffer = await pending;
		return { buffer, cacheStatus: 'HIT' };
	}

	const createPromise = create()
		.then((buffer) => {
			setCachedThumbnail(key, buffer);
			return buffer;
		})
		.finally(() => {
			inflight.delete(key);
		});

	inflight.set(key, createPromise);
	const buffer = await createPromise;
	return { buffer, cacheStatus: 'MISS' };
}
