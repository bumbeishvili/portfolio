// What each project is built with, read from its code (read-only): package.json dependencies,
// the kinds of files in the repository and the libraries its pages load.
// Local folders are read from disk, GitHub repositories with `gh api`.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sources = require('./sources.js');
const root = path.resolve(__dirname, '../../..'); // the folder that holds this repository and the other projects
const out = path.join(__dirname, 'detect.json');
const saved = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
const run = (cmd, args, opts = {}) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000, maxBuffer: 128e6, ...opts }); } catch { return ''; } };

// name -> what to look for in the text of pages and scripts
const marks = {
	d3: /d3(\.v\d)?(\.min)?\.js|from ['"]d3['"]|from ['"]d3-|require\(['"]d3|d3js\.org|\bd3\.select/,
	three: /three(\.min|\.module)?\.js|from ['"]three['"]|THREE\.|@react-three|threlte/,
	'react-three-fiber': /@react-three\/fiber/,
	mapbox: /mapbox-gl|mapboxgl\.|api\.mapbox\.com/,
	maplibre: /maplibre-gl|maplibregl\./,
	leaflet: /leaflet(\.min)?\.js|L\.map\(|from ['"]leaflet['"]/,
	'deck.gl': /deck\.gl|deckgl|@deck\.gl/,
	'google-maps': /maps\.googleapis\.com|google\.maps\./,
	topojson: /topojson/,
	crossfilter: /crossfilter/,
	'dc.js': /\bdc(\.min)?\.js\b/,
	jquery: /jquery/i,
	bootstrap: /bootstrap(\.min)?\.(css|js)/,
	'chart.js': /chart(\.min)?\.js\b|from ['"]chart\.js/i,
	echarts: /echarts/,
	plotly: /plotly/,
	highcharts: /highcharts/,
	gsap: /gsap|TweenMax|ScrollTrigger/,
	lottie: /lottie/i,
	scrollama: /scrollama/,
	mediapipe: /mediapipe/i,
	tensorflow: /tensorflow|tfjs/,
	openai: /openai|api\.openai\.com/i,
	anthropic: /anthropic|claude-/i,
	gemini: /generativelanguage\.googleapis|@google\/generative-ai|gemini-/i,
	stripe: /stripe/i,
	supabase: /supabase/i,
	firebase: /firebase/i,
	'socket.io': /socket\.io/,
	websocket: /new WebSocket\(/,
	webrtc: /RTCPeerConnection|peerjs|simple-peer/i,
	canvas: /getContext\(['"]2d['"]\)/,
	webgl: /getContext\(['"]webgl|WebGLRenderer|gl_FragColor|gl_Position/,
	shaders: /gl_FragColor|gl_Position|ShaderMaterial|\.glsl/,
	'web-worker': /new Worker\(/,
	'service-worker': /serviceWorker\.register/,
	pwa: /manifest\.(json|webmanifest)/,
	papaparse: /papaparse|Papa\.parse/,
	xlsx: /xlsx|sheetjs/i,
	pdf: /jspdf|pdfmake|pdf-lib|html2pdf|pdfkit/i,
	codemirror: /codemirror/i,
	monaco: /monaco-editor/,
	photosphere: /photo-sphere-viewer|pannellum/i,
	brainbrowser: /brainbrowser/i,
	layercake: /layercake/,
	tailwind: /tailwindcss|cdn\.tailwindcss/,
	vite: /\bvite\b/,
	webpack: /webpack/,
	express: /require\(['"]express['"]\)|from ['"]express['"]/,
	fetchApi: /fetch\(\s*[`'"]https?:\/\/(?!(cdn|unpkg|fonts|raw\.githubusercontent))/,
	geojson: /geojson/i,
	observable: /observablehq/,
	analytics: /googletagmanager|gtag\(|plausible|posthog/
};
const textExt = /\.(html?|js|mjs|cjs|jsx|ts|tsx|svelte|vue|py|json|toml|glsl|frag|vert|css|scss)$/i;
const skip = /(^|\/)(node_modules|dist|build|\.svelte-kit|\.next|\.vercel|vendor|libs?|test-results|playwright-report|coverage|\.git)\//;

function summarise(files, readText) {
	const ext = {};
	for (const f of files) { const e = (f.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase(); if (e) ext[e] = (ext[e] || 0) + 1; }
	const names = files.join('\n');
	const found = new Set();
	// libraries kept in the repository as files (libs/d3.v4.min.js and the like)
	for (const [name, re] of Object.entries({ d3: /(^|\/)d3(\.v\d+)?(\.min)?\.js$/m, three: /(^|\/)three(\.min|\.module)?\.js$/m, mapbox: /mapbox-gl/, leaflet: /leaflet/, topojson: /topojson/, crossfilter: /crossfilter/, jquery: /jquery/i, bootstrap: /bootstrap/, 'deck.gl': /deck\.?gl/i, brainbrowser: /brainbrowser/i })) if (re.test(names)) found.add(name);
	const deps = {};
	const pkgs = files.filter((f) => /(^|\/)package\.json$/.test(f) && !skip.test(f)).slice(0, 6);
	for (const p of pkgs) { try { const j = JSON.parse(readText(p)); Object.assign(deps, j.dependencies, j.devDependencies); } catch {} }
	const read = files.filter((f) => textExt.test(f) && !skip.test(f) && !/package(-lock)?\.json$|\.min\.|\.map$|(^|\/)data\//.test(f));
	// pages first, then scripts; a bounded number of files
	read.sort((a, b) => (/\.html?$/.test(b) - /\.html?$/.test(a)) || (/\.(svelte|tsx|jsx|vue)$/.test(b) - /\.(svelte|tsx|jsx|vue)$/.test(a)) || a.length - b.length);
	let budget = 4e6, count = 0;
	for (const f of read) {
		if (count >= readText.max || budget <= 0) break;
		const text = readText(f);
		if (!text || text.length > 1.5e6) continue;
		count++; budget -= text.length;
		for (const [name, re] of Object.entries(marks)) if (!found.has(name) && re.test(text)) found.add(name);
	}
	const special = [];
	if (/(^|\/)wrangler\.(toml|jsonc?)$/m.test(names)) special.push('cloudflare');
	if (/(^|\/)vercel\.json$/m.test(names)) special.push('vercel');
	if (/(^|\/)(Dockerfile|docker-compose\.ya?ml)$/m.test(names)) special.push('docker');
	if (/(^|\/)supabase\//m.test(names)) special.push('supabase-dir');
	if (/(^|\/)(prisma|drizzle)/m.test(names)) special.push('orm');
	if (/\.sql$/m.test(names)) special.push('sql');
	if (/\+server\.(js|ts)$/m.test(names) || /(^|\/)(server|api)\/.*\.(js|ts|py)$/m.test(names)) special.push('server-code');
	if (/(^|\/)Procfile$/m.test(names)) special.push('heroku');
	if (/\.github\/workflows\//.test(names)) special.push('github-actions');
	if (/(^|\/)(playwright|vitest|jest)\.config/m.test(names) || /\.(test|spec)\.(js|ts)$/m.test(names)) special.push('tests');
	return { files: files.length, ext: Object.fromEntries(Object.entries(ext).sort((a, b) => b[1] - a[1]).slice(0, 14)), deps: Object.keys(deps).sort(), found: [...found].sort(), special, readFiles: count };
}

function local(name, sub) {
	const dir = path.join(root, name);
	let files = run('git', ['-C', dir, 'ls-files', '--cached', '--others', '--exclude-standard']).split('\n').filter(Boolean);
	if (sub) files = files.filter((f) => f.startsWith(sub + '/'));
	const readText = (f) => { try { const p = path.join(dir, f); if (fs.statSync(p).size > 1.5e6) return ''; return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
	readText.max = 400;
	return summarise(files, readText);
}

function github(repo) {
	const files = run('gh', ['api', `repos/${repo}/git/trees/HEAD?recursive=1`, '-q', '.tree[] | select(.type=="blob") | .path']).split('\n').filter(Boolean);
	const langs = run('gh', ['api', `repos/${repo}/languages`]).trim();
	const readText = (f) => run('gh', ['api', `repos/${repo}/contents/${f.split('/').map(encodeURIComponent).join('/')}`, '-H', 'Accept: application/vnd.github.raw']);
	readText.max = 14; // each file is one request
	return { ...summarise(files, readText), langs: langs ? JSON.parse(langs) : {} };
}

for (const [slug, list] of Object.entries(sources)) {
	for (const s of list) {
		const key = s.local ? 'local:' + s.local + (s.sub ? '/' + s.sub : '') : 'gh:' + s.gh;
		if (saved[key] && !process.env.FORCE) continue;
		saved[key] = s.local ? local(s.local, s.sub) : github(s.gh);
		const r = saved[key];
		console.log(slug.padEnd(44), key.slice(0, 52).padEnd(53), String(r.files).padStart(5), 'files |', r.found.join(' '), '|', r.special.join(' '));
		fs.writeFileSync(out, JSON.stringify(saved));
	}
}
