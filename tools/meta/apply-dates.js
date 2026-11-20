// Sets each project's date from the commits of its code.
// Rule: the year of the last stretch of work on the project. README edits, file uploads and a single
// follow-up commit months later do not move it (those cases are listed in `keep`).
const fs = require('fs'), path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'compare.json'), 'utf8'));
const commits = JSON.parse(fs.readFileSync(path.join(__dirname, 'commits.json'), 'utf8'));
const sources = require('./sources.js');
const content = require('path').resolve(__dirname, '../../src/content');
const generated = new Set([...require('../gh/entries.js'), ...require('../gh/entries2.js')].map((e) => e.slug));

// year to keep although later commits exist, with the reason
const keep = {
	coronavirus: [2020, 'later commits are README edits'],
	'class-diagram-builder': [2020, 'one small commit in January 2021'],
	geohistory: [2018, 'the 2021 commits only hide a sidebar'],
	'climate-ai': [2020, 'later commits are README edits'],
	'org-chart': [2024, '2025 and 2026 commits are README edits'],
	'justice-snapshot': [2019, '2020 commits are leftovers and a README edit'],
	'bog-visualizations': [2017, 'one colour change in 2019'],
	'flight-simulator-globe': [2022, '2024 commits are image uploads'],
	'minecraft-biome-map': [2021, 'one small edit in 2025'],
	'mind-map-with-search': [2019, '2020 commits add a video and edit the README'],
	'agriculture-charts': [2018, 'README edit in 2019'],
	'entrepreneurs-bubble-chart-and-us-income-map': [2017, 'one commit in January 2018'],
	'forecast-chart-widgets': [2016, 'the 2017 commits publish the demo page'],
	'public-development-bank-climate-portal': [2025, '2026 commits are README edits']
};
const changes = [], dates = {};
for (const r of rows) {
	if (!r.last) continue;
	const all = [];
	for (const s of sources[r.slug]) for (const l of commits[s.local ? 'local:' + s.local + (s.sub ? '/' + s.sub : '') : 'gh:' + s.gh] || []) if (!l.startsWith('ERR')) all.push(l.slice(0, 10));
	all.sort();
	const year = keep[r.slug] ? keep[r.slug][0] : +(r.lastReal || r.last).slice(0, 4);
	const date = all.filter((d) => +d.slice(0, 4) === year).at(-1) || all.at(-1);
	if (generated.has(r.slug)) dates[r.slug] = date;
	if (r.year !== year) changes.push({ slug: r.slug, file: r.file, from: r.year, to: year, generated: generated.has(r.slug), why: keep[r.slug]?.[1] || '' });
	else if (keep[r.slug]) changes.push({ slug: r.slug, kept: year, why: keep[r.slug][1] });
}
dates['self-assembling-burger'] = '2026-11-16'; // not in git: the dates of its files
fs.writeFileSync(path.join(__dirname, '..', 'gh', 'dates.json'), JSON.stringify(dates, null, 1));
for (const c of changes.filter((c) => c.to && !c.generated && c.file)) {
	const file = path.join(content, c.file);
	const text = fs.readFileSync(file, 'utf8');
	const next = text.replace(/^year:\s*\d+\s*$/m, 'year: ' + c.to);
	if (next === text) console.log('NOT CHANGED', c.file); else fs.writeFileSync(file, next);
}
fs.writeFileSync(path.join(__dirname, 'date-changes.json'), JSON.stringify(changes, null, 1));
for (const c of changes) console.log(c.to ? `${c.slug}: ${c.from} -> ${c.to}${c.generated ? ' (generated)' : ''}` : `${c.slug}: stays ${c.kept} (${c.why})`);
