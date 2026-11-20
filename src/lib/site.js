// Site-wide settings (previously _data/settings.yml in the Jekyll site).

export const site = {
	title: 'David B.',
	// The full name is not shown on the pages. It goes into the structured data, so that search
	// engines can tell this site, the GitHub account and the org chart library belong to one person.
	fullName: 'David Bumbeishvili',
	tagline: 'Creative developer with advanced data visualization focus',
	// The job title in the structured data, and the home page's title.
	jobTitle: 'Data visualization developer',
	// The employer, for the structured data.
	employer: { name: 'infogr8', url: 'https://infogr8.com' },
	// Used as the home page's description in search results and link previews, and as the
	// fallback for any page that has none of its own.
	description:
		"I'm a data visualization developer at infogr8 and the author of the d3-org-chart library. I also take on additional projects outside working hours.",
	// Image for link previews when a page has no picture of its own.
	shareImage: '/images/social.png',
	url: 'https://davidb.dev',
	email: 'me@davidb.dev'
};

/**
 * Sidebar menu. An item may have `children`, which render as a row of sub-tabs under it.
 * A child with `section: true` is also highlighted on the pages below its URL (/all/map/).
 * @type {{ title: string, url: string, children?: { title: string, url: string, section?: boolean }[] }[]}
 */
export const menu = [
	{
		title: 'Projects',
		url: '/',
		children: [
			{ title: '2D', url: '/2d/' },
			{ title: '3D', url: '/gl/' },
			{ title: 'All', url: '/all/', section: true }
		]
	},
	{ title: 'Notable Collaborations', url: '/notable-collaborations/' },
	{ title: 'Blog', url: '/blog/' },
	{ title: 'About', url: '/about' }
];

/**
 * The projects shown on the home page, in this order. Each entry is the URL of a project page.
 * The 2D and 3D tabs list everything of their kind, and All adds the notable collaborations,
 * so this only decides what visitors see first.
 */
export const featured = [
	'/project/securelogic',
	'/project/org-chart',
	'/project/climate-ai',
	'/project/bbfaw',
	'/project/justice-snapshot',
	'/project/nautical-cloud',
	'/project/coronavirus',
	'/gl/clim-globe',
	'/gl/rick-threejs-globe-area-upw',
	'/gl/population-map-deck-gl',
	'/notable-collaborations/sff',
	'/notable-collaborations/public-servant-project',
	'/notable-collaborations/mastercard-foundation',
	'/notable-collaborations/comptia-careers'
];

/** Blog posts that are also listed on the All tab, alongside the projects. */
export const postsInAll = ['/blog/moxalise', '/blog/pension-calculator'];

/** Social links shown in the sidebar and the mobile footer. `icon` is a key of `icons` in Socials.svelte. */
export const socials = [
	{ title: 'Linkedin', icon: 'linkedin', url: 'https://www.linkedin.com/in/bumbeishvili/' },
	{ title: 'Github', icon: 'github', url: 'https://github.com/bumbeishvili' },
	{ title: 'Medium', icon: 'medium', url: 'https://medium.com/@bumbeishvili' }
];

/**
 * Other profiles of the same person. They are not shown on the pages: together with the socials
 * they go into the structured data as "the same person as".
 */
export const profiles = [
	'https://observablehq.com/@bumbeishvili',
	'https://www.fiverr.com/bumbeishvili',
	'https://x.com/dbumbeishvili'
];

/** Builds the <title>: "David B. – ..." on the home page, "... – David B." everywhere else. */
export function pageTitle(title, pathname) {
	return pathname === '/' ? `${site.title} – ${title}` : `${title} – ${site.title}`;
}
