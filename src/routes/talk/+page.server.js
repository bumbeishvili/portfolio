import { list } from '$lib/server/content.js';

// Legacy page from the old theme. Nothing links to it, but the URL has always existed,
// so it still works; it is marked "noindex" to stay out of search results.
export const trailingSlash = 'always';

export function load() {
	return { posts: list('talks'), meta: { title: 'Talk', noindex: true } };
}
