// Keeps the pictures and clips of hidden projects off the published site.
// A page with `hidden: true` in its front matter is not built (src/lib/server/content.js), but the
// files under static/ are copied as they are. This writes static/.assetsignore, the list of files
// Cloudflare must not upload: every file a hidden page uses, unless a visible page uses it too.
// It runs before every build (the "prebuild" script in package.json) and needs no packages.
//      node tools/gh/hidden-assets.js
const fs = require('fs');
const path = require('path');

const site = path.resolve(__dirname, '../..');
const content = path.join(site, 'src/content');
const statics = path.join(site, 'static');
const postersFile = path.join(site, 'src/lib/server/posters.json');
const posters = fs.existsSync(postersFile) ? JSON.parse(fs.readFileSync(postersFile, 'utf8')) : {};

// Every card picture the site will ask for must exist. A missing one would show as a broken image
// on the cards, so the build stops here instead (the fix is to run tools/gh/posters.js).
const missing = Object.values(posters)
	.flatMap((poster) => [poster.src, poster.small])
	.filter((address) => address && !fs.existsSync(path.join(statics, address)));
if (missing.length) {
	console.error(`${missing.length} card pictures are missing, for example ${missing.slice(0, 3).join(', ')}.`);
	console.error('Run `node tools/gh/posters.js` (in tools/, after npm install) and build again.');
	process.exit(1);
}

const hidden = [], visible = [];
for (const collection of fs.readdirSync(content)) {
	const dir = path.join(content, collection);
	if (!fs.statSync(dir).isDirectory()) continue;
	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith('.md')) continue;
		const text = fs.readFileSync(path.join(dir, file), 'utf8');
		const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] || '';
		// every address under /images/ the page mentions, plus the still of its card clip
		const used = new Set(text.match(/\/images\/[^\s"')>\]]+/g) || []);
		for (const address of [...used]) if (posters[address]) { used.add(posters[address].src); if (posters[address].small) used.add(posters[address].small); }
		(/^hidden:\s*true\s*$/m.test(front) ? hidden : visible).push({ file: `${collection}/${file}`, used });
	}
}

const shown = new Set(visible.flatMap((page) => [...page.used]));
const shownFolders = new Set([...shown].map((address) => path.posix.dirname(address)));
const lines = [];
for (const page of hidden) {
	lines.push(`# ${page.file}`);
	const folders = new Set([...page.used].map((address) => path.posix.dirname(address)));
	for (const folder of folders) {
		// a folder no visible page uses goes as a whole (it may hold files the page no longer mentions)
		if (!shownFolders.has(folder) && folder.split('/').length > 3 && fs.existsSync(path.join(statics, folder))) lines.push(folder.slice(1) + '/');
		else for (const address of page.used) if (path.posix.dirname(address) === folder && !shown.has(address)) lines.push(address.slice(1));
	}
}

const header = [
	'# Written by tools/gh/hidden-assets.js before every build: do not edit.',
	'# Files of hidden projects, which Cloudflare leaves out of the upload.',
	''
];
fs.writeFileSync(path.join(statics, '.assetsignore'), [...header, ...lines, ''].join('\n'));
console.log(`${hidden.length} hidden ${hidden.length === 1 ? 'page' : 'pages'}; ${lines.filter((line) => !line.startsWith('#')).length} paths kept off the published site`);
