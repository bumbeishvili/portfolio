// Checks the pages touched in this round on the dev server: pictures load, galleries exist,
// the All tab lists every project and the new tags filter.
const { chromium } = require('playwright');
const fs = require('fs');
const base = 'http://localhost:3002';
(async () => {
	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
	const errors = [];
	p.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
	const content = require('path').resolve(__dirname, '../../src/content');
	const pages = [];
	for (const [c, prefix] of [['more', '/project/'], ['projects', '/project/'], ['gl', '/gl/'], ['notable-collaborations', '/notable-collaborations/']]) for (const f of fs.readdirSync(content + '/' + c)) if (!/^hidden:\s*true\s*$/m.test(fs.readFileSync(content + '/' + c + '/' + f, 'utf8').split('\n---')[0])) pages.push(prefix + f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''));
	const bad = [], few = [];
	for (const url of pages) {
		const res = await p.goto(base + url, { waitUntil: 'load', timeout: 60000 }).catch(() => null);
		if (!res || res.status() !== 200) { bad.push(url + ' status ' + (res && res.status())); continue; }
		await p.evaluate(async () => { for (const img of document.querySelectorAll('.page__content img')) { img.loading = 'eager'; } window.scrollTo(0, document.body.scrollHeight); });
		await p.waitForTimeout(350);
		const r = await p.evaluate(() => {
			const imgs = [...document.querySelectorAll('.page__content img')];
			const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
			return { imgs: imgs.length, broken, videos: document.querySelectorAll('.page__content video').length + document.querySelectorAll('.page__content iframe').length, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
		});
		if (r.broken.length) bad.push(url + ' broken ' + r.broken.join(','));
		if (r.overflow) bad.push(url + ' overflows');
		if (r.imgs + r.videos < 3) few.push(`${url} (${r.videos} video, ${r.imgs} img)`);
	}
	console.log(pages.length, 'pages checked');
	console.log('problems:', bad.length ? '\n  ' + bad.join('\n  ') : 'none');
	console.log('pages with fewer than 3 pictures or clips:', few.length ? '\n  ' + few.join('\n  ') : 'none');
	// All tab
	await p.goto(base + '/all/', { waitUntil: 'load' });
	await p.waitForTimeout(800);
	const all = await p.evaluate(() => ({ cards: document.querySelectorAll('.portfolio-item__link').length, tags: [...document.querySelectorAll('.tag')].map((t) => t.textContent.trim().replace(/\s+/g, ' ') + (t.hidden ? ' (hidden)' : '')) }));
	console.log('all tab cards:', all.cards); console.log('all tab tags:', all.tags.length, '|', all.tags.join(' · '));
	await p.screenshot({ path: 'sel2/verify-all.png' });
	for (const t of ['data-visualization', 'api-integration', '3d-modeling', 'full-stack', 'real-estate', 'accessibility', 'mediapipe', 'ai']) {
		const res = await p.goto(base + '/all/' + t + '/', { waitUntil: 'load' });
		const n = await p.evaluate(() => document.querySelectorAll('.portfolio-item__link').length);
		console.log('tag page', t, res.status(), n, 'links');
	}
	await p.goto(base + '/project/gla-london-energy-charts', { waitUntil: 'load' });
	await p.waitForTimeout(1500);
	await p.screenshot({ path: 'sel2/verify-gla.png', fullPage: true });
	console.log('page errors:', errors.length ? errors.slice(0, 5).join(' | ') : 'none');
	await b.close();
})();
