import { list } from '$lib/server/content.js';
import { itemList } from '$lib/server/structured-data.js';

export const trailingSlash = 'always';

export function load() {
	const posts = list('posts');
	return {
		posts,
		meta: { title: 'Blog', description: 'Notes from talks and workshops, plus a few small tools.' },
		structuredData: itemList('Blog', posts)
	};
}
