// Checks a published copy of the site (argv: its address, e.g. https://davidb.dev): the main pages
// answer, clean addresses work, a wrong address gives the 404 page, files have the right type,
// videos can be fetched in parts, and a sample of project pages show no broken pictures.
const { chromium } = require('playwright');
const base = (process.argv[2] || '').replace(/\/$/, '');
(async () => {
	if (!base) { console.log('usage: node gh/verify-live.js https://address'); process.exit(1); }
	const head = async (path, init = {}) => { const r = await fetch(base + path, { redirect: 'manual', ...init }); return { status: r.status, type: r.headers.get('content-type') || '', location: r.headers.get('location') || '', cache: r.headers.get('cache-control') || '', length: r.headers.get('content-length') || '', range: r.headers.get('content-range') || '', text: init.text ? await r.text() : '' }; };
	const problems = [];
	const expect = (ok, what) => { if (!ok) problems.push(what); };
	for (const path of ['/', '/about', '/all/', '/2d/', '/gl/', '/notable-collaborations/', '/blog/', '/all/d3-js/', '/project/org-chart', '/notable-collaborations/sff', '/project/yff-data-dashboard']) {
		const r = await head(path); expect(r.status === 200 && r.type.includes('text/html'), `${path} -> ${r.status} ${r.type}`);
	}
	const missing = await head('/no-such-page'); expect(missing.status === 404, `/no-such-page -> ${missing.status} (wanted 404)`);
	const slash = await head('/about/'); expect([301, 302, 307, 308, 200].includes(slash.status), `/about/ -> ${slash.status}`);
	for (const [path, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml'], ['/llms.txt', 'text/plain'], ['/feed.xml', 'xml'], ['/projects.json', 'json'], ['/images/social.png', 'image/png']]) {
		const r = await head(path); expect(r.status === 200 && r.type.includes(type), `${path} -> ${r.status} ${r.type}`);
	}
	const home = await head('/', { text: true });
	const title = (/<title>(.*?)<\/title>/.exec(home.text) || [])[1];
	const asset = (/\/_app\/immutable\/[^"']+\.js/.exec(home.text) || [])[0];
	if (asset) { const r = await head(asset); expect(r.status === 200 && /immutable/.test(r.cache), `${asset.slice(0, 40)} cache-control: ${r.cache || 'none'}`); }
	const part = await head('/images/projects/yff-data-dashboard/video.mp4', { headers: { Range: 'bytes=0-999' } });
	expect(part.status === 206 && part.type.includes('video/mp4'), `video in parts -> ${part.status} ${part.type} ${part.range}`);
	console.log('title:', title);
	console.log('trailing slash on /about/ ->', slash.status, slash.location);

	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
	const errors = []; p.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));
	for (const path of ['/', '/all/', '/notable-collaborations/sff', '/project/yff-data-dashboard', '/project/thunes-live-transactions', '/gl/andromeda-globe', '/project/geohistory']) {
		await p.goto(base + path, { waitUntil: 'load', timeout: 90000 });
		await p.evaluate(() => { for (const i of document.querySelectorAll('img')) i.loading = 'eager'; });
		await p.waitForTimeout(3500);
		const r = await p.evaluate(() => { const im = [...document.querySelectorAll('img')]; return { imgs: im.length, broken: im.filter((i) => i.complete && !i.naturalWidth).map((i) => i.getAttribute('src')).slice(0, 3), videos: document.querySelectorAll('video').length, playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length }; });
		expect(!r.broken.length, `${path} broken pictures ${r.broken.join(', ')}`);
		console.log(path.padEnd(44), JSON.stringify(r));
	}
	expect(!errors.length, 'page errors: ' + errors.join(' | '));
	await b.close();
	console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'no problems');
})();
