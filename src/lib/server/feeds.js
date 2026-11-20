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

export function llmsIndex() {
	const projects = projectDocuments();
	const about = documents().find((doc) => doc.url === '/about');

	const line = (doc, title = doc.year ? `${doc.title} (${doc.year})` : doc.title) => {
		const labels = doc.tags?.length ? `Tags: ${doc.tags.join(', ')}.` : technologies(doc).length ? `Tech: ${technologies(doc).join(', ')}.` : '';
		const details = [summary(doc), labels].filter(Boolean).join(' ');
		return `- [${title}](${absolute(doc.url)})${details ? `: ${details}` : ''}`;
	};
	const section = (title, lines) => (lines.length ? `## ${title}\n\n${lines.join('\n')}\n` : '');

	const selected = projects.filter((project) => project.featured);
	const rest = projects.filter((project) => !project.featured);
	const of = (collection) => rest.filter((project) => project.collection === collection).map((doc) => line(doc));

	return [
		`# ${site.title}\n`,
		`> ${site.description} This is my portfolio, at ${site.url}.\n`,
		about ? `${summary(about)}\n` : '',
		section('About and contact', [
			`- [About](${absolute('/about')}): who I am and how to reach me`,
			`- Email: ${site.email}`,
			...socials.map((social) => `- [${social.title}](${social.url})`)
		]),
		section(
			'Technologies',
			expertise(projects).map(({ technology, projects: count }) => `- ${technology}: ${count} ${count === 1 ? 'project' : 'projects'}`)
		),
		section('Selected work', selected.map((doc) => line(doc))),
		section('Notable collaborations', of('notable-collaborations')),
		section('2D projects', [...of('projects'), ...of('posts')]),
		section('3D projects', of('gl')),
		section('More projects', of('more')),
		section(
			'Blog',
			posts().map((post) => line(post, `${post.title} (${post.date})`))
		),
		`## Optional\n\n- [Full text of every page](${absolute('/llms-full.txt')})\n- [Projects as JSON](${absolute('/projects.json')})\n- [Projects RSS feed](${absolute('/projects.xml')})\n- [Blog RSS feed](${absolute('/feed.xml')})\n- [Sitemap](${absolute('/sitemap.xml')})\n`
	]
		.filter(Boolean)
		.join('\n');
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

	return (
		[
			`# ${site.title}\n\n> ${site.tagline}\n\nEvery page of ${site.url} as plain text. Contact: ${site.email}`,
			about && entry(about, 'About page'),
			...projects.map((doc) => entry(doc, kinds[doc.collection])),
			...otherPosts.map((doc) => entry(doc, kinds[doc.collection]))
		]
			.filter(Boolean)
			.join('\n\n---\n\n') + '\n'
	);
}
