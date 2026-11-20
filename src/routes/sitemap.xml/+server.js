import { site } from '$lib/site.js';
import { allTags, allUrls } from '$lib/server/content.js';

export const prerender = true;

// Pages that are not generated from a content file. (/old/, the previous version of the site,
// is left out: it is kept for old links, not for search engines.)
const staticPages = ['/', '/2d/', '/gl/', '/all/', '/notable-collaborations/', '/blog/'];

export function GET() {
	// tag pages with fewer than three projects are marked noindex (see the All tab), so they are not listed
	const tagPages = allTags()
		.filter((tag) => tag.count >= 3)
		.map((tag) => `/all/${tag.slug}/`);
	const urls = [...staticPages, ...tagPages, ...allUrls()]
		.map((path) => `<url>\n<loc>${site.url}${path}</loc>\n</url>`)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

	return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
