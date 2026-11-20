// Small helpers for describing a document in words: used by the feeds and the structured data.

/** What each collection is called in the feeds. */
export const kinds = {
	projects: '2D project',
	gl: '3D project',
	'notable-collaborations': 'Notable collaboration',
	more: 'Project',
	posts: 'Blog post'
};

/** The readable text of a rendered page: no markup, scripts or styles. */
export function plainText(html) {
	return html
		.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|tr|section)\s*>|<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&amp;/g, '&')
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean)
		.join('\n');
}

/** The text of a page's body. Interactive tool posts are mostly code, which is not worth quoting. */
export const bodyText = (doc) => (doc.layout === 'tool' ? '' : plainText(doc.html));

/**
 * One line about a page: its `description` when that says something, otherwise the first sentence
 * of the page itself.
 */
export function summary(doc) {
	const description = String(doc.description ?? '').trim();
	if (description.split(/\s+/).length >= 4) return description;

	// the first line of the page that reads like a sentence (skips headings, labels and list items)
	const text = bodyText(doc)
		.split('\n')
		.find((line) => line.split(' ').length >= 5);
	if (!text) return '';

	const sentence = /^.{30,220}?[.!?](?=\s|$)/.exec(text);
	if (sentence) return sentence[0];
	return text.length > 220 ? text.slice(0, 200).replace(/\s+\S*$/, '') + '…' : text;
}

/** The technologies of a project: its `subtitle` ("d3.js, react") as a list. */
export function technologies(doc) {
	return String(doc.subtitle ?? '')
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean);
}

/** How many of the given projects use each technology, most used first. */
export function expertise(projects) {
	const counts = new Map();
	for (const project of projects) {
		for (const name of new Set(technologies(project).map((t) => t.toLowerCase()))) {
			const entry = counts.get(name) ?? { technology: technologies(project).find((t) => t.toLowerCase() === name), projects: 0 };
			entry.projects++;
			counts.set(name, entry);
		}
	}
	return [...counts.values()].sort((a, b) => b.projects - a.projects);
}
