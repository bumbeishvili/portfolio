import { list } from '$lib/server/content.js';
import { itemList } from '$lib/server/structured-data.js';

// The "2D" tab: src/content/projects
export const trailingSlash = 'always';

export function load() {
	const projects = list('projects');
	return {
		projects,
		meta: {
			title: '2D data visualization projects',
			description:
				'Data visualization projects built with d3.js. Mostly charts and maps, with some org charts and dashboards.'
		},
		structuredData: itemList('2D projects', projects)
	};
}
