// Adds the tags in tags.js to the projects: hand-written pages get their front matter edited,
// generated pages get theirs through gh/tags.json (read by gh/generate.js).
const fs = require('fs'), path = require('path');
const add = require('./tags.js');
const content = path.resolve(__dirname, '../../src/content');
const generated = new Map([...require('../gh/entries.js'), ...require('../gh/entries2.js')].map((e) => [e.slug, e]));
const dataTags = ['d3', 'd3.js', 'chart', 'map', 'dashboard', 'tree', 'org chart', 'network', 'timeline', 'sankey', 'diagram', 'storytelling', 'globe', 'deck.gl'];
const withData = (tags) => (tags.some((t) => dataTags.includes(t)) && !tags.includes('data visualization') ? [...tags, 'data visualization'] : tags);
// a tag written a second way becomes the spelling in tag-aliases.json ("d3" is "d3.js")
const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, 'tag-aliases.json'), 'utf8'));
const spelled = (list) => [...new Set(list.map((t) => aliases[t] || t))];
const union = (a, b) => spelled([...a, ...b.filter((t) => !a.includes(t))]);
// Work done at infogr8 is tagged "infogr8", so it can be listed on its own (/all/infogr8/). A page counts
// as such when it says it was made in partnership with infogr8, or as a Friday experiment there.
// (The user asked for this on 2026-11-27. It applies to lists set in the tag editor too.)
const madeWithInfogr8 = (text) => /partnership with[^\n]{0,12}infogr8|Friday experiment at[^\n]{0,4}infogr8/i.test(text.split(/^---$/m).slice(2).join('---'));
const withInfogr8 = (tags, text) => (madeWithInfogr8(text) && !tags.includes('infogr8') ? [...tags, 'infogr8'] : tags);
// a list set by hand in the tag editor (meta/set-tags.js) is final: nothing is added to it here
const fixedFile = path.join(__dirname, 'tags-fixed.json');
const fixed = fs.existsSync(fixedFile) ? JSON.parse(fs.readFileSync(fixedFile, 'utf8')) : {};
const report = [], out = {}, seen = new Set();
for (const c of ['projects', 'gl', 'notable-collaborations', 'more']) for (const f of fs.readdirSync(path.join(content, c))) {
	if (!f.endsWith('.md')) continue;
	const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
	seen.add(slug);
	const file = path.join(content, c, f);
	const text = fs.readFileSync(file, 'utf8');
	const m = /^tags:\s*\[(.*)\]\s*$/m.exec(text);
	if (!m) { report.push({ slug, error: 'no tags line' }); continue; }
	if (generated.has(slug)) {
		const before = generated.get(slug).tags;
		const after = withInfogr8(fixed[slug] || withData(union(before, add[slug] || [])), text);
		out[slug] = after;
		report.push({ slug, file: c + '/' + f, before, added: after.filter((t) => !before.includes(t)) });
		continue;
	}
	const before = m[1].split(',').map((t) => t.trim()).filter(Boolean);
	const after = withInfogr8(fixed[slug] || withData(union(before, add[slug] || [])), text);
	if (after.join('|') !== before.join('|')) fs.writeFileSync(file, text.replace(m[0], `tags: [${after.join(', ')}]`));
	report.push({ slug, file: c + '/' + f, before, added: after.filter((t) => !before.includes(t)) });
}
for (const slug of generated.keys()) if (!out[slug]) out[slug] = fixed[slug] || withData(union(generated.get(slug).tags, add[slug] || [])); // not on the site yet
for (const slug of Object.keys(add)) if (!seen.has(slug) && !generated.has(slug)) console.log('UNKNOWN SLUG', slug);
fs.writeFileSync(path.join(__dirname, '..', 'gh', 'tags.json'), JSON.stringify(out, null, 1));
fs.writeFileSync(path.join(__dirname, 'tag-report.json'), JSON.stringify(report, null, 1));
const count = {};
for (const r of report) for (const t of r.added || []) count[t] = (count[t] || 0) + 1;
console.log(report.length, 'pages;', report.filter((r) => r.added?.length).length, 'got new tags');
console.log(Object.entries(count).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' | '));
