// Tag editor for the portfolio: a local page that lists every project with its tags, where tags are
// added from a dropdown or typed in. Nothing on the site changes: each edit is saved to
// tags-edited.json in this folder, and that list is applied afterwards with meta/set-tags.js.
//   node tools/tag-editor/server.js      then open http://localhost:3003
const http = require('http');
const fs = require('fs');
const path = require('path');

const site = path.resolve(__dirname, '../..');
const content = path.join(site, 'src/content');
const statics = path.join(site, 'static');
const saved = path.join(__dirname, 'tags-edited.json');
const collections = ['projects', 'gl', 'notable-collaborations', 'more']; // the order the All tab uses within a year
const port = Number(process.env.PORT || 3003);
// a second spelling of a tag that exists already becomes that tag (the same list meta/set-tags.js uses)
const aliasFile = path.join(__dirname, '../meta/tag-aliases.json');
const aliasList = () => { try { return JSON.parse(fs.readFileSync(aliasFile, 'utf8')); } catch { return {}; } };
const alias = (tag) => aliasList()[tag] || tag;
// Tags put on a project outside the editor (asked for in chat) while an editor tab was open: { slug: [tags] }.
// A tab that has not read the site since then does not know them, so they are added to what it saves.
const outside = path.join(__dirname, 'added-outside.json');
const addedOutside = () => { try { return JSON.parse(fs.readFileSync(outside, 'utf8')); } catch { return {}; } };

const field = (text, name) => (new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(text)?.[1] || '').trim().replace(/^(['"])(.*)\1$/, '$2');

function projects() {
	const list = [];
	for (const collection of collections) {
		for (const file of fs.readdirSync(path.join(content, collection))) {
			if (!file.endsWith('.md')) continue;
			const text = fs.readFileSync(path.join(content, collection, file), 'utf8');
			const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] || '';
			const tags = /^tags:\s*\[(.*)\]\s*$/m.exec(front);
			if (!tags) continue;
			const image = field(front, 'featured_image');
			const poster = image.replace(/[^/]+$/, 'poster.webp');
			const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
			const twin = list.find((p) => p.slug === slug); // a project shown on two tabs is one row here
			if (twin) { twin.collection += ' + ' + collection; continue; }
			list.push({
				slug,
				collection,
				date: file.slice(0, 10),
				title: field(front, 'title'),
				hidden: /^hidden:\s*true\s*$/m.test(front),
				year: Number(field(front, 'year')) || 0,
				description: field(front, 'description'),
				tags: tags[1].split(',').map((t) => t.trim()).filter(Boolean),
				image,
				poster: /\.mp4$/.test(image) && fs.existsSync(path.join(statics, poster)) ? poster : ''
			});
		}
	}
	return list.sort((a, b) => b.year - a.year || collections.indexOf(a.collection) - collections.indexOf(b.collection) || b.date.localeCompare(a.date));
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };

function sendFile(req, res, file) {
	let stat;
	try { stat = fs.statSync(file); } catch { res.writeHead(404).end('not found'); return; }
	if (!stat.isFile()) { res.writeHead(404).end('not found'); return; }
	const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
	const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
	if (range) { // videos are asked for in parts
		const start = range[1] ? Number(range[1]) : 0;
		const end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
		res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
		fs.createReadStream(file, { start, end }).pipe(res);
		return;
	}
	res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
	fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
	const url = new URL(req.url, 'http://localhost');
	const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
	try {
		if (req.method === 'GET' && url.pathname === '/') return sendFile(req, res, path.join(__dirname, 'index.html'));
		if (req.method === 'GET' && url.pathname === '/api/projects') {
			const edited = fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, 'utf8')) : null;
			const body = { projects: projects(), edited, file: path.relative(site, saved), aliases: aliasList() };
			// a page that has just read the site knows about the tags added outside it
			if (url.searchParams.has('seen')) fs.rmSync(outside, { force: true });
			return json(200, body);
		}
		if (req.method === 'POST' && url.pathname === '/api/save') {
			let body = '';
			req.on('data', (chunk) => { body += chunk; if (body.length > 2e6) req.destroy(); });
			req.on('end', () => {
				try {
					const { tags } = JSON.parse(body);
					const known = new Set(projects().map((p) => p.slug));
					const clean = {};
					for (const [slug, list] of Object.entries(tags || {})) {
						if (!known.has(slug) || !Array.isArray(list)) continue;
						clean[slug] = [...new Set(list.map((t) => alias(String(t).toLowerCase().replace(/[\[\],"']/g, '').replace(/\s+/g, ' ').trim())).filter(Boolean))];
					}
					for (const [slug, list] of Object.entries(addedOutside())) if (clean[slug]) clean[slug] = [...new Set([...clean[slug], ...list])];
					const savedAt = new Date().toISOString();
					fs.writeFileSync(saved, JSON.stringify({ savedAt, tags: clean }, null, 1));
					json(200, { ok: true, savedAt, projects: Object.keys(clean).length });
				} catch (e) { json(400, { ok: false, error: String(e).slice(0, 200) }); }
			});
			return;
		}
		if (req.method === 'POST' && url.pathname === '/api/discard') { fs.rmSync(saved, { force: true }); return json(200, { ok: true }); }
		if (req.method === 'GET' && (url.pathname.startsWith('/images/') || url.pathname.startsWith('/static/'))) {
			const file = path.join(statics, decodeURIComponent(url.pathname.replace(/^\/static/, '')));
			if (!file.startsWith(statics + path.sep)) { res.writeHead(403).end('no'); return; }
			return sendFile(req, res, file);
		}
		res.writeHead(404).end('not found');
	} catch (e) { json(500, { error: String(e).slice(0, 200) }); }
}).listen(port, '127.0.0.1', () => console.log(`Tag editor: http://localhost:${port}  (saves to ${path.relative(site, saved)})`));
