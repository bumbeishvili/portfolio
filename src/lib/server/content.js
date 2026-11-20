import fs from 'node:fs';
import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import { featured, pageTitle, postsInAll, site } from '$lib/site.js';
import { bodyText, expertise, kinds, technologies } from './describe.js';
import { renderMarkdown } from './markdown.js';
// the first frame of each card clip as a small picture: written by tools/gh/posters.js
import posters from './posters.json';
import { documentData, person, profilePage } from './structured-data.js';

// All content lives in src/content/<collection>/*.md: YAML front matter followed by markdown/HTML.
//
// File names follow the Jekyll convention `YYYY-MM-DD-slug.md`. The date in the file name decides the
// order of the cards (newest first), and the rest becomes the URL. A `date:` in the front matter wins
// over the one in the file name.

const files = import.meta.glob('/src/content/**/*.md', { query: '?raw', import: 'default', eager: true });

/**
 * Per collection: URL prefix, the layout used when the front matter does not name one, and the
 * list page its documents belong to (where their Back link leads).
 */
const collections = {
	projects: { base: '/project/', layout: 'project', list: '/2d/' },
	gl: { base: '/gl/', layout: 'project', list: '/gl/' },
	// More projects (older client work, side projects): they only appear on the All tab.
	more: { base: '/project/', layout: 'project', list: '/all/' },
	'notable-collaborations': { base: '/notable-collaborations/', layout: 'post', list: '/notable-collaborations/' },
	posts: { base: '/blog/', layout: 'post', list: '/blog/' },
	talks: { base: '/talks/', layout: 'default' },
	pages: { base: '/', layout: 'page' }
};

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
]; // prettier-ignore

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** "22 September 2019" */
function longDate(date) {
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Gives every picture in a page alternative text (for search engines and screen readers) unless
 * the author wrote one: the page's title, then "Title, image 2", and so on. The first picture of
 * the page is also marked to be fetched before the others: it is usually the largest thing on screen.
 */
function addAltText(html, title) {
	const label = String(title).trim().replace(/&/g, '&amp;').replace(/"/g, '&quot;');
	let count = 0;
	return html.replace(/<img\b([^>]*)>/gi, (tag, attributes) => {
		count++;
		if (/\balt\s*=\s*(?:"[^"]+"|'[^']+')/i.test(attributes)) return tag;
		const rest = attributes.replace(/\s*\balt\s*=\s*(?:""|'')/i, '');
		return `<img alt="${count === 1 ? label : `${label}, image ${count}`}"${rest}>`;
	}).replace(/<img\b(?![^>]*\bfetchpriority)/i, '<img fetchpriority="high"'); // the first picture is fetched first
}

function parse(path, raw) {
	const [, collection, file] = /^\/src\/content\/([^/]+)\/(.+)\.md$/.exec(path);
	const { base, layout } = collections[collection];
	const { data, content } = matter(raw);

	const dated = /^(\d{2,4})-(\d{1,2})-(\d{1,2})-(.*)$/.exec(file);
	const fileDate = dated ? new Date(Date.UTC(+dated[1], +dated[2] - 1, +dated[3])) : null;
	const date = data.date instanceof Date ? data.date : fileDate;
	const slug = slugify(dated ? dated[4] : file);

	const resolvedLayout = data.layout === 'gl' ? 'project' : (data.layout ?? layout);
	const rendered = renderMarkdown(content);

	return {
		collection,
		path,
		slug,
		url: base + slug,
		time: date ? date.getTime() : 0,
		date: date ? longDate(date) : '',
		layout: resolvedLayout,
		title: data.title ?? '',
		subtitle: data.subtitle ?? '',
		description: data.description ?? '',
		featured_image: data.featured_image ?? '',
		language: data.language ?? '',
		top: data.top ?? '',
		// `hidden: true` in the front matter keeps a page off the site: see `docs` below
		hidden: data.hidden === true,
		// Projects state their year in the front matter (their file-name date only sets the order).
		// Blog posts have real dates, so theirs can be read from the date.
		year: Number(data.year) || (collection === 'posts' && date ? date.getUTCFullYear() : ''),
		tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
		// (the tool posts are mostly code, which must not be touched)
		html: resolvedLayout === 'tool' ? rendered : addAltText(rendered, data.title ?? '')
	};
}

// Same order Jekyll gives a collection: by date, then by file path.
const everything = Object.entries(files)
	.map(([path, raw]) => parse(path, raw))
	.sort((a, b) => a.time - b.time || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

// A hidden page (`hidden: true` in its front matter) stays in the repository and is left out of
// the site altogether: no page is built for it, no list or tag counts it, and it is in no feed,
// sitemap or search index. Its pictures and clips are not published either (tools/gh/hidden-assets.js).
// Removing the line brings it back.
const hiddenUrls = new Set(everything.filter((doc) => doc.hidden).map((doc) => doc.url));
const docs = everything.filter((doc) => !doc.hidden);

/** The fields a grid card needs (keeps the page data small). */
function card({ url, title, subtitle, featured_image, top, date, language }) {
	// `poster` is the still shown until the clip plays: { src, width, height }, or nothing for a card without one
	return { url, title, subtitle, featured_image, top, date, language, poster: posters[featured_image] };
}

/** Cards of a collection, newest first. */
export function list(collection) {
	return docs
		.filter((doc) => doc.collection === collection)
		.reverse()
		.map(card);
}

/** The hand-picked projects for the home page, in the order given in src/lib/site.js. */
export function listFeatured() {
	return featured.map((url) => {
		const doc = docs.find((doc) => doc.url === url);
		// a featured project that is hidden for now is skipped; anything else unknown is a typing mistake
		if (!doc && hiddenUrls.has(url)) return null;
		if (!doc) throw new Error(`Featured project "${url}" (src/lib/site.js) does not match any project page`);
		return card(doc);
	}).filter(Boolean);
}

/**
 * Everything for the "All" tab: notable collaborations, 3D and 2D projects, the rest of the projects (src/content/more),
 * plus the blog posts named in `postsInAll` (src/lib/site.js).
 *
 * Sorted by `year`, most recent first (projects without a year come last). Within a year the
 * projects keep the order they have on their own page: collaborations, then 3D, then 2D, then
 * the rest. A project filed in more than one collection is shown once.
 */
function allProjects() {
	const rank = { 'notable-collaborations': 0, gl: 1, projects: 2, posts: 3, more: 4 };
	const older = (doc) => (doc.collection === 'more' ? 1 : 0);
	const seen = new Set();

	for (const url of postsInAll) {
		if (!docs.some((doc) => doc.url === url)) {
			throw new Error(`"${url}" in postsInAll (src/lib/site.js) does not match any page`);
		}
	}

	return docs
		.filter((doc) => (doc.collection === 'posts' ? postsInAll.includes(doc.url) : doc.collection in rank))
		.sort(
			(a, b) =>
				Number(b.year) - Number(a.year) ||
				older(a) - older(b) ||
				b.time - a.time ||
				rank[a.collection] - rank[b.collection] ||
				(a.path < b.path ? 1 : a.path > b.path ? -1 : 0)
		)
		.filter((doc) => !seen.has(doc.title) && seen.add(doc.title));
}

/** Tags as they are used in URLs: "org chart" -> "org-chart", "three.js" -> "three-js". */
const tagLink = (name) => ({ name, slug: slugify(name) });

/** Every tag used by the projects on the All tab, most used first: `{ name, slug, count }`. */
export function allTags() {
	const counts = new Map();
	for (const doc of allProjects()) for (const name of doc.tags) counts.set(name, (counts.get(name) ?? 0) + 1);
	return [...counts]
		.map(([name, count]) => ({ ...tagLink(name), count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * The All tab as groups of cards, one group per year: `[{ title: 2025, projects: [...] }, ...]`.
 * The current year's group has an empty title: it needs no divider, the page simply starts with it.
 * With `tag` (a tag slug), only the projects that carry that tag.
 */
export function listAllProjectsByYear(tag = '') {
	const thisYear = new Date().getFullYear();
	const groups = [];
	const projects = allProjects().filter((doc) => !tag || doc.tags.some((name) => slugify(name) === tag));
	for (const doc of projects) {
		const title = doc.year === thisYear ? '' : doc.year || 'Undated';
		if (groups.at(-1)?.title !== title) groups.push({ title, projects: [] });
		// the tag slugs travel with each card, so the page can combine tags in the browser, and so
		// does the text the search box looks through: title, technologies, tags, description and year
		const search = [doc.title, doc.subtitle, doc.tags.join(' '), doc.description, doc.year].join(' ').toLowerCase().replace(/\s+/g, ' ');
		groups.at(-1).projects.push({ ...card(doc), tags: doc.tags.map(slugify), search });
	}
	return groups;
}

/**
 * The readable text of every project page on the All tab, lower-cased, by page address: what the
 * search box looks through besides the titles and tags (served as /search.json).
 */
export function searchIndex() {
	return Object.fromEntries(allProjects().map((doc) => [doc.url, bodyText(doc).toLowerCase().replace(/\s+/g, ' ')]));
}

/** The same projects with all their details, hand-picked ones first: what the feeds list. */
export function projectDocuments() {
	const all = allProjects();
	const picked = featured.map((url) => all.find((doc) => doc.url === url)).filter(Boolean);
	return [...picked, ...all.filter((doc) => !picked.includes(doc))].map((doc) => ({
		...doc,
		title: doc.title.trim(),
		featured: picked.includes(doc)
	}));
}

/**
 * Technology names, most used first: the "skills" in the structured data. Only what several
 * projects are built with, so a library that appeared once does not sit next to d3.js.
 */
const skills = () =>
	expertise(allProjects())
		.filter((entry) => entry.projects >= 3 && !/engineering/i.test(entry.technology))
		.map((entry) => entry.technology);

/** Structured data for the home page: who the site is about. */
export const homeStructuredData = () => person(skills());

/**
 * Page data for a single document: `load` functions of the detail routes return this.
 * `collection` may be a list when several collections share a URL prefix.
 */
export function loadDocument(collection, slug) {
	const doc = docs.find((doc) => [collection].flat().includes(doc.collection) && doc.slug === slug);
	if (!doc) error(404, 'Not found');

	const { url, layout, title, subtitle, description, html } = doc;
	const image = shareImage(doc);
	return {
		doc: { url, layout, title, subtitle, html, back: collections[doc.collection].list, tags: doc.tags.map(tagLink) },
		meta: {
			title: titleWithTechnology(doc),
			description: String(description).trim().length > 3 ? String(description).trim() : '',
			image,
			type: doc.collection === 'posts' ? 'article' : 'website',
			canonical: canonicalUrl(doc),
			noindex: isHidden(doc)
		},
		structuredData:
			url === '/about' ? profilePage(skills()) : doc.collection === 'pages' ? null : documentData(doc, image)
	};
}

/**
 * A project's title as search results show it, with what it is built with: "Sequoia - Org Chart (d3.js)".
 * At most two technologies, fewer when the title is long, and none when it names one already.
 * Posts and pages keep their title.
 */
function titleWithTechnology(doc) {
	const title = doc.title.trim();
	if (!(doc.collection in kinds) || doc.collection === 'posts') return title;
	const names = technologies(doc).filter((name) => !/engineering/i.test(name));
	if (names.some((name) => title.toLowerCase().includes(name.toLowerCase().replace(/\.js$/, '')))) return title;
	// two technologies if the whole title stays short enough for a search result, else one, else none
	const fits = (text) => pageTitle(text, doc.url).length <= 65;
	const longer = `${title} (${names.slice(0, 2).join(', ')})`;
	const shorter = `${title} (${names[0]})`;
	return !names.length ? title : fits(longer) ? longer : fits(shorter) ? shorter : title;
}

const isPicture = (src) => /\.(png|jpe?g|webp|gif)$/i.test(src);
const fileExists = (src) => /^https?:/.test(src) || fs.existsSync('static' + decodeURI(src));

/**
 * The picture shown when a page is shared or listed in search results. Most thumbnails are videos,
 * which previews cannot show, so this is the first still picture on the page (a GIF if there is
 * nothing else), or the site-wide image.
 */
function shareImage(doc) {
	// still pictures on the page: images, and the poster of a video
	const onPage = [...doc.html.matchAll(/<(?:img\b[^>]*\bsrc|video\b[^>]*\bposter)=["']([^"']+)["']/gi)].map((match) => match[1]);
	// a video thumbnail may have a still next to it: poster.webp in the same folder
	const beside = /\.(mp4|webm|mov)$/i.test(doc.featured_image ?? '') ? doc.featured_image.replace(/[^/]+$/, 'poster.webp') : '';
	const pictures = [doc.featured_image, ...onPage, beside].filter((src) => src && isPicture(src) && fileExists(src));
	return pictures.find((src) => !/\.gif$/i.test(src)) ?? pictures[0] ?? site.shareImage;
}

/**
 * A few pages exist twice (a project filed under both 2D and 3D, and an old talks page). Search
 * engines are pointed at one address for each: the copy that the All tab lists.
 */
function canonicalUrl(doc) {
	if (!['projects', 'gl', 'talks'].includes(doc.collection)) return doc.url;
	return allProjects().find((project) => project.title === doc.title)?.url ?? doc.url;
}

/** Pages that should stay out of search results: leftovers from the old theme. */
const isHidden = (doc) => doc.collection === 'talks' || doc.url === '/thanks';

/** Route params of every document in a collection, so the detail routes know what to prerender. */
export function entries(collection, param = 'slug') {
	return docs.filter((doc) => [collection].flat().includes(doc.collection)).map((doc) => ({ [param]: doc.slug }));
}

/** Every document, with the fields the feeds are built from (see ./feeds.js). */
export function documents() {
	return docs.map(({ collection, url, layout, title, subtitle, description, date, time, year, tags, html }) => ({
		collection, url, layout, title: title.trim(), subtitle, description, date, time, year, tags, html
	})); // prettier-ignore
}

/** Every document URL, for the sitemap. */
export function allUrls() {
	return docs.filter((doc) => !isHidden(doc) && canonicalUrl(doc) === doc.url).map((doc) => doc.url);
}
