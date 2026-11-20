import { homeStructuredData, listFeatured } from '$lib/server/content.js';
import { site } from '$lib/site.js';

// Home page: the featured projects (the list is in src/lib/site.js).
export function load() {
	return {
		projects: listFeatured(),
		meta: { title: site.jobTitle, description: site.description },
		structuredData: homeStructuredData()
	};
}
