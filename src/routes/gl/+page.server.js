import { list } from '$lib/server/content.js';
import { itemList } from '$lib/server/structured-data.js';

// The "3D" tab: src/content/gl
export const trailingSlash = 'always';

export function load() {
	const projects = list('gl');
	return {
		projects,
		meta: {
			title: '3D and WebGL projects',
			description: '3D projects built with Three.js and WebGL. Mostly globes and product configurators.'
		},
		structuredData: itemList('3D projects', projects)
	};
}
