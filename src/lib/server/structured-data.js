import { profiles, site, socials } from '$lib/site.js';
import { kinds, summary, technologies } from './describe.js';

// schema.org descriptions (JSON-LD) that go into the <head> of a page. Search engines and AI
// crawlers read these to learn what a page is about without having to interpret the layout.

const absolute = (path) => (/^https?:/.test(path) ? path : site.url + path);
const author = { '@type': 'Person', name: site.title, url: site.url };

/** The person behind the site. `skills` is a list of technology names. */
export function person(skills) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: site.title,
		alternateName: site.fullName,
		url: site.url,
		email: site.email,
		jobTitle: site.jobTitle,
		worksFor: { '@type': 'Organization', name: site.employer.name, url: site.employer.url },
		description: site.tagline,
		sameAs: [...socials.map((social) => social.url), ...profiles],
		knowsAbout: ['Data visualization', ...skills]
	};
}

/** The about page: a profile page whose subject is that person. */
export function profilePage(skills) {
	const { '@context': context, ...mainEntity } = person(skills);
	return { '@context': context, '@type': 'ProfilePage', url: absolute('/about'), mainEntity };
}

/** A list page: the pages it links to, in order. `items` are cards (`{ title, url }`). */
export function itemList(name, items) {
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name,
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.title.trim(),
			url: absolute(item.url)
		}))
	};
}

/** A project or a blog post. `image` is the picture used for link previews. */
export function documentData(doc, image) {
	const common = {
		'@context': 'https://schema.org',
		url: absolute(doc.url),
		description: summary(doc) || undefined,
		image: image ? absolute(image) : undefined
	};

	if (doc.collection === 'posts') {
		return {
			...common,
			'@type': 'BlogPosting',
			headline: doc.title.trim(),
			datePublished: new Date(doc.time).toISOString().slice(0, 10),
			author
		};
	}

	return {
		...common,
		'@type': 'CreativeWork',
		name: doc.title.trim(),
		genre: kinds[doc.collection],
		dateCreated: doc.year ? String(doc.year) : undefined,
		keywords: [...new Set([...(doc.tags ?? []), ...technologies(doc)])].join(', ') || undefined,
		creator: author
	};
}
