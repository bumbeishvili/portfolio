import { site, socials } from '$lib/site.js';
import { documents, projectDocuments } from './content.js';
import { bodyText, expertise, kinds, summary, technologies } from './describe.js';

// Machine-readable views of the site, generated from the same content as the pages:
//
//   /feed.xml        RSS feed of the blog, for feed readers
//   /projects.xml    RSS feed of the projects
//   /projects.json   the projects as structured data: type, technologies, description, links
//   /llms.txt        a short markdown index of the whole site, for AI agents (https://llmstxt.org)
//   /llms-full.txt   the text of every page in one file, for agents that want it all at once
//
// "Projects" here means everything on the All tab, with the home page's hand-picked ones first.

const absolute = (path) => site.url + path;

const escapeXml = (text) =>
	String(text).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

const rssDocument = ({ title, link, self, description, extra = '', items }) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(title)}</title>
<link>${link}</link>
<description>${escapeXml(description)}</description>
<language>en</language>
<atom:link href="${self}" rel="self" type="application/rss+xml"/>
${extra}${items.join('\n')}
</channel>
</rss>
`;

const posts = () =>
	documents()
		.filter((doc) => doc.collection === 'posts')
		.reverse();

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - RSS

export function rss() {
	const all = posts();
	return rssDocument({
		title: `${site.title} – Blog`,
		link: absolute('/blog/'),
		self: absolute('/feed.xml'),
		description: site.tagline,
		extra: `<lastBuildDate>${new Date(all[0].time).toUTCString()}</lastBuildDate>\n`,
		items: all.map(
			(post) => `<item>
<title>${escapeXml(post.title)}</title>
<link>${absolute(post.url)}</link>
<guid isPermaLink="true">${absolute(post.url)}</guid>
<pubDate>${new Date(post.time).toUTCString()}</pubDate>
<description>${escapeXml(summary(post))}</description>
</item>`
		)
	});
}

export function projectsRss() {
	return rssDocument({
		title: `${site.title} – Projects`,
		link: absolute('/all/'),
		self: absolute('/projects.xml'),
		description: `${site.tagline}. Data visualization and creative-coding projects.`,
		// No dates: the projects are listed best-first, not by when they were made.
		items: projectDocuments().map(
			(project) => `<item>
<title>${escapeXml(project.title)}</title>
<link>${absolute(project.url)}</link>
<guid isPermaLink="true">${absolute(project.url)}</guid>
<description>${escapeXml(summary(project))}</description>
<category>${escapeXml(kinds[project.collection])}</category>
${technologies(project)
	.map((name) => `<category>${escapeXml(name)}</category>`)
	.join('\n')}
</item>`
		)
	});
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - JSON

export function projectsJson() {
	const projects = projectDocuments();
	return JSON.stringify(
		{
			name: site.title,
			description: site.tagline,
			url: site.url,
			contact: { email: site.email, about: absolute('/about') },
			profiles: socials.map((social) => social.url),
			expertise: expertise(projects),
			projects: projects.map((project) => ({
				title: project.title,
				url: absolute(project.url),
				type: kinds[project.collection],
				featured: project.featured,
				year: project.year || undefined,
				tags: project.tags,
				technologies: technologies(project),
				description: summary(project),
				thumbnail: absolute(project.featured_image)
			}))
		},
		null,
		'\t'
	);
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - llms.txt

/**
 * The two text files use plain keyboard characters only: no curly quotes, long dashes, bullets,
 * check marks or degree signs. They are read as raw text, by programs and by people in a browser
 * tab, and such characters turn into garbage whenever the reader guesses the encoding wrong.
 * (The pages themselves keep their typography.) Letters of other alphabets are left as they are.
 */
const plain = (text) =>
	text
		.replace(/[\u2018\u2019\u201A\u2032]/g, "'")
		.replace(/[\u201C\u201D\u201E\u2033]/g, '"')
		.replace(/[ \t]*\u2014[ \t]*/g, ' - ') // long dash
		.replace(/\u2013/g, '-') // short dash
		.replace(/\u2026/g, '...')
		.replace(/\u00A0/g, ' ')
		.replace(/[ \t]*\u00B7[ \t]*/g, ', ') // middle dot between links
		.replace(/[\u2022\u25CF\u25E6\u2713\u2714\u2192\u00B0]/g, '') // bullets, check marks, arrows, degree sign
		.replace(/\u00D7/g, 'x')
		.replace(/[ \t]+$/gm, '')
		.replace(/(\S) {2,}/g, '$1 '); // (the indent at the start of a line stays)

export function llmsIndex() {
	// The layout is the one the llms.txt proposal (llmstxt.org) describes, so that its parsers can
	// read the file: a title, a one-line summary in a blockquote, free text, then sections whose
	// every line is "- [name](address): notes". "Optional" is the proposal's name for the section
	// a reader may skip.
	const projects = projectDocuments();
	const about = documents().find((doc) => doc.url === '/about');

	// one entry on one line: the year, what it is, its tags
	const line = (doc, when = doc.year) => {
		const labels = doc.tags?.length ? `Tags: ${doc.tags.join(', ')}.` : technologies(doc).length ? `Tech: ${technologies(doc).join(', ')}.` : '';
		const what = summary(doc);
		const notes = [when && `${when}.`, what && (/[.!?]$/.test(what) ? what : what + '.'), labels].filter(Boolean).join(' ');
		// a "]" in a title would end the link early
		const name = doc.title.trim().replace(/[\[\]]/g, '');
		return `- [${name}](${absolute(doc.url)})${notes ? `: ${notes}` : ''}`;
	};
	const section = (title, lines) => (lines.length ? `## ${title}\n\n${lines.join('\n')}\n` : '');

	const selected = projects.filter((project) => project.featured);
	const rest = projects.filter((project) => !project.featured);
	const of = (collection) => rest.filter((project) => project.collection === collection).map((doc) => line(doc));

	return plain(
		[
			`# ${site.title}\n`,
			`> ${site.description}\n`,
			`This is my portfolio, at ${site.url}. Contact: ${site.email}\n`,
			about ? `${summary(about)}\n` : '',
			// free text before the sections may hold a list, which is where the plain facts go
			`Technologies, by number of projects:\n\n${expertise(projects)
				.map(({ technology, projects: count }) => `- ${technology}: ${count}`)
				.join('\n')}\n`,
			section('About', [
				`- [About](${absolute('/about')}): who I am and how to reach me`,
				...socials.map((social) => `- [${social.title}](${social.url})`)
			]),
			section('Selected work', selected.map((doc) => line(doc))),
			section('Notable collaborations', of('notable-collaborations')),
			section('2D projects', [...of('projects'), ...of('posts')]),
			section('3D projects', of('gl')),
			section('More projects', of('more')),
			section(
				'Blog',
				posts().map((post) => line(post, post.date))
			),
			section('Optional', [
				`- [Full text of every page](${absolute('/llms-full.txt')})`,
				`- [Projects as JSON](${absolute('/projects.json')})`,
				`- [Projects RSS feed](${absolute('/projects.xml')})`,
				`- [Blog RSS feed](${absolute('/feed.xml')})`,
				`- [Sitemap](${absolute('/sitemap.xml')})`
			])
		]
			.filter(Boolean)
			.join('\n')
	);
}

export function llmsFull() {
	const about = documents().find((doc) => doc.url === '/about');
	const projects = projectDocuments();
	const otherPosts = posts().filter((post) => !projects.some((project) => project.url === post.url));

	const entry = (doc, kind) =>
		[
			`# ${doc.title}`,
			'',
			`URL: ${absolute(doc.url)}`,
			`Type: ${kind}${doc.collection === 'posts' ? `, ${doc.date}` : doc.year ? `, ${doc.year}` : ''}`,
			technologies(doc).length ? `Technologies: ${technologies(doc).join(', ')}` : null,
			doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : null,
			summary(doc) ? `Summary: ${summary(doc)}` : null,
			'',
			bodyText(doc)
		]
			.filter((part) => part !== null)
			.join('\n')
			.trim();

	return plain(
		[
			`# ${site.title}\n\n${site.description}\n\nEvery page of ${site.url} as plain text. Contact: ${site.email}`,
			about && entry(about, 'About page'),
			...projects.map((doc) => entry(doc, kinds[doc.collection])),
			...otherPosts.map((doc) => entry(doc, kinds[doc.collection]))
		]
			.filter(Boolean)
			.join('\n\n---\n\n') + '\n'
	);
}
