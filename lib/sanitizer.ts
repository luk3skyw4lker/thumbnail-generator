const entityMap: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;'
};

/** Same sanitizer as the original project (used for logo URLs in HTML). */
export function sanitizeHtml(html: string) {
	return String(html).replace(/[&<>"'/]/g, (key) => entityMap[key]);
}

/** Escape only what HTML attributes need (for non-URL text). */
export function escapeAttribute(value: string) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
