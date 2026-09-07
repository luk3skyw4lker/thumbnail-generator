const DEFAULT_HEX = /^#[0-9a-f]{3,8}$/i;

/** Bare CSS keywords: `white`, `transparent`, `rebeccapurple`. */
const NAMED = /^[a-z]+$/i;

/**
 * Functional notation. The inner character class is the whole point: no `;`,
 * `{`, `}`, `"` or `url(` can appear, so a value cannot escape the
 * declaration it is interpolated into.
 */
const FUNCTIONAL =
	/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([0-9a-z.,%\s/+-]*\)$/i;

/**
 * Colors are interpolated straight into a `<style>` block (`bg`) and into a
 * `style="color:…"` attribute (`iconColor`). Only accept shapes that cannot
 * carry an extra declaration or comment.
 */
export function isSafeColor(value: string): boolean {
	const normalized = value.trim();
	if (normalized === '' || normalized.includes('*')) return false;

	return (
		DEFAULT_HEX.test(normalized) ||
		NAMED.test(normalized) ||
		FUNCTIONAL.test(normalized)
	);
}

/** Returns `fallback` for anything unsafe rather than failing the render. */
export function parseColor(value: string | null, fallback: string): string {
	if (value == null) return fallback;
	const normalized = value.trim();
	return isSafeColor(normalized) ? normalized : fallback;
}
