/** Escape only what is needed inside an HTML attribute URL. */
export function escapeAttribute(value: string) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

const entityMap: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;'
};

/** Full HTML-text sanitizer (for untrusted text nodes, not URLs). */
export function sanitizeHtml(html: string) {
	return String(html).replace(/[&<>"'/]/g, (key) => entityMap[key]);
}
