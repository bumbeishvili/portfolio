// Compares the year each project page shows with the commits of its code.
const fs = require('fs'), path = require('path');
const sources = require('./sources.js');
const commits = JSON.parse(fs.readFileSync(path.join(__dirname, 'commits.json'), 'utf8'));
const content = require('path').resolve(__dirname, '../../src/content');
const pages = {};
for (const c of ['projects', 'gl', 'notable-collaborations', 'more']) for (const f of fs.readdirSync(path.join(content, c))) {
	const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
	const text = fs.readFileSync(path.join(content, c, f), 'utf8');
	pages[slug] = pages[slug] || { file: c + '/' + f, year: +(/^year:\s*(\d+)/m.exec(text) || [])[1], fileDate: f.slice(0, 10) };
}
// commits that are not work on the project itself
const noise = /^(Update README|Create README|Rename|Initial commit|Create CNAME|Delete CNAME|Update CNAME|Add files via upload|Set theme|Update LICENSE|Create LICENSE|Bump |Merge |Update index\.md|Update \.gitignore)/i;
const rows = [];
for (const [slug, list] of Object.entries(sources)) {
	const all = [];
	for (const s of list) {
		const key = s.local ? 'local:' + s.local + (s.sub ? '/' + s.sub : '') : 'gh:' + s.gh;
		for (const line of commits[key] || []) if (!line.startsWith('ERR')) all.push(line);
	}
	all.sort();
	const real = all.filter((l) => !noise.test(l.slice(11)));
	const byYear = {};
	for (const l of all) byYear[l.slice(0, 4)] = (byYear[l.slice(0, 4)] || 0) + 1;
	const page = pages[slug] || {};
	rows.push({ slug, file: page.file, year: page.year, fileDate: page.fileDate, first: all[0]?.slice(0, 10), last: all.at(-1)?.slice(0, 10), lastReal: real.at(-1)?.slice(0, 10), byYear, tail: all.slice(-3).map((l) => l.slice(0, 70)) });
}
fs.writeFileSync(path.join(__dirname, 'compare.json'), JSON.stringify(rows, null, 1));
for (const r of rows) {
	const flag = r.last && String(r.year) !== r.last.slice(0, 4) ? '!!' : '  ';
	console.log(flag, r.slug.padEnd(46), String(r.year).padEnd(5), (r.first || '-').padEnd(11), (r.last || '-').padEnd(11), Object.entries(r.byYear).map(([y, n]) => y.slice(2) + ':' + n).join(' '));
	if (flag === '!!') for (const t of r.tail) console.log('        ', t);
}
