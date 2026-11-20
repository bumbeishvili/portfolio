// Sets the tags of the projects to exactly the list made in the tag editor (tag-editor/tags-edited.json,
// or another file given as the first argument: { slug: [tags] } or { tags: { slug: [tags] } }).
//   node meta/set-tags.js            shows what would change
//   node meta/set-tags.js --write    changes the pages
// Hand-written pages get their front matter edited. Generated pages keep their tags in gh/tags.json,
// so they survive the next run of gh/generate.js. The list is also kept in meta/tags-fixed.json,
// which meta/apply-tags.js leaves alone from then on.
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const write = args.includes('--write');
const source = args.find((a) => !a.startsWith('--')) || path.join(__dirname, '../tag-editor/tags-edited.json');
const content = path.resolve(__dirname, '../../src/content');
const tagsFile = path.join(__dirname, '../gh/tags.json');
const fixedFile = path.join(__dirname, 'tags-fixed.json');

const read = JSON.parse(fs.readFileSync(source, 'utf8'));
const wanted = read.tags && !Array.isArray(read.tags) ? read.tags : read;
// a second spelling of a tag that exists already (typed in by hand) becomes that tag
const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, 'tag-aliases.json'), 'utf8'));
const clean = (t) => { const tag = String(t).toLowerCase().replace(/[\[\],"']/g, '').replace(/\s+/g, ' ').trim(); return aliases[tag] || tag; };
const generatedTags = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
const fixed = fs.existsSync(fixedFile) ? JSON.parse(fs.readFileSync(fixedFile, 'utf8')) : {};

const files = {}; // slug -> its content files (a project can be on two tabs)
for (const c of ['projects', 'gl', 'notable-collaborations', 'more']) for (const f of fs.readdirSync(path.join(content, c))) {
	if (!f.endsWith('.md')) continue;
	(files[f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')] ||= []).push(path.join(content, c, f));
}

let changedPages = 0;
const tally = { added: {}, removed: {} };
for (const [slug, list] of Object.entries(wanted)) {
	if (!files[slug]) { console.log('UNKNOWN PROJECT', slug); continue; }
	const tags = [...new Set(list.map(clean).filter(Boolean))];
	if (!tags.length) { console.log('NO TAGS LEFT, skipped:', slug); continue; }
	let reported = false;
	for (const file of files[slug]) {
		const text = fs.readFileSync(file, 'utf8');
		const m = /^tags:\s*\[(.*)\]\s*$/m.exec(text);
		if (!m) { console.log('no tags line:', path.relative(content, file)); continue; }
		const before = m[1].split(',').map((t) => t.trim()).filter(Boolean);
		if (before.join('|') === tags.join('|')) continue;
		const added = tags.filter((t) => !before.includes(t)), removed = before.filter((t) => !tags.includes(t));
		if (!reported) {
			reported = true; changedPages++;
			for (const t of added) tally.added[t] = (tally.added[t] || 0) + 1;
			for (const t of removed) tally.removed[t] = (tally.removed[t] || 0) + 1;
			console.log(slug.padEnd(46), added.map((t) => '+' + t).join(' '), removed.map((t) => '-' + t).join(' '), !added.length && !removed.length ? '(order only)' : '');
		}
		if (write) fs.writeFileSync(file, text.replace(m[0], `tags: [${tags.join(', ')}]`));
	}
	if (slug in generatedTags) generatedTags[slug] = tags;
	fixed[slug] = tags;
}
const line = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' | ') || 'none';
console.log(`\n${changedPages} projects change. Added: ${line(tally.added)}. Removed: ${line(tally.removed)}.`);
if (write) {
	fs.writeFileSync(tagsFile, JSON.stringify(generatedTags, null, 1));
	fs.writeFileSync(fixedFile, JSON.stringify(fixed, null, 1));
	console.log('Written.');
} else console.log('Nothing written. Run again with --write to apply.');
