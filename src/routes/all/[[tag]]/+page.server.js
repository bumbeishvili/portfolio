import { error } from '@sveltejs/kit';
import { allTags, listAllProjectsByYear } from '$lib/server/content.js';
import { itemList } from '$lib/server/structured-data.js';
import { tagMeta } from '$lib/server/tag-meta.js';

// The "All" tab: every project, grouped by year. /all/<tag>/ is the same list showing only the
// projects with that tag (the tags are set in each project's front matter).
export const trailingSlash = 'always';

export function load({ params }) {
	const tags = allTags();
	const tag = params.tag ? tags.find((t) => t.slug === params.tag) : null;
	if (params.tag && !tag) error(404, 'Not found');

	const groups = listAllProjectsByYear(tag?.slug);
	const projects = groups.flatMap((group) => group.projects);
	// a tag page is titled the way people search ("Org chart examples"): see tag-meta.js
	const meta = tag
		? tagMeta(tag, projects)
		: { title: 'All projects', description: 'All projects on one page, newest first. Tags narrow the list.' };

	return {
		groups,
		tags,
		// how many projects the All tab lists without a filter
		total: tag ? listAllProjectsByYear().reduce((sum, group) => sum + group.projects.length, 0) : projects.length,
		activeTag: tag?.slug ?? '',
		// a tag with one or two projects repeats what those project pages say, so search engines are
		// asked to leave it out; it still works as a filter and as a link
		meta: { ...meta, noindex: Boolean(tag) && projects.length < 3 },
		structuredData: itemList(meta.title, projects)
	};
}
