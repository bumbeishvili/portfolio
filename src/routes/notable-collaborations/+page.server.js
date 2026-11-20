import { list } from '$lib/server/content.js';
import { itemList } from '$lib/server/structured-data.js';

// Client work: src/content/notable-collaborations
export const trailingSlash = 'always';

export function load() {
	const projects = list('notable-collaborations');
	return {
		projects,
		meta: {
			title: 'Notable collaborations',
			description:
				'Data visualization work for Harvard and CompTIA. Other clients include Mastercard Foundation and Sequoia Capital.'
		},
		structuredData: itemList('Notable collaborations', projects)
	};
}
