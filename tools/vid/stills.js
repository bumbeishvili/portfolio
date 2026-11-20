// Screenshots of a project in use. Runs the same scripted interactions as the clip, without the
// drawn cursor, and photographs the page each time it has settled; then keeps the few pictures
// that differ most from one another. Extra pages (other charts, other routes) can be added per project.
//   node vid/stills.js [slug ...]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getBrowser, closeBrowser, contentBox, mouse } = require('./recorder.js');

const scenarios = {
	...require('./scenarios.js'),
	...require('./scenarios-sel2.js'),
	...require('./scenario-diamond.js'),
	...require('./scenario-connect.js'),
	...require('./scenario-datatable.js'),
	...require('./scenario-yff.js'),
	...require('./scenario-ageing.js'),
	...require('./scenarios-old.js'),
	'360-tour-generator': require('./scenario-stitch.js')['360-tour-stitching']
};
const pages = require('./pages.js'); // slug -> other pages worth a picture
const OUT = path.resolve(__dirname, '../shots');
const even = (n) => Math.floor(n / 2) * 2;

async function tiny(file) { return sharp(file).resize(48, 30, { fit: 'fill' }).greyscale().raw().toBuffer(); }
const distance = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };

async function shoot(slug) {
	const spec = scenarios[slug] || {};
	const viewport = spec.viewport || { width: 1280, height: 800 };
	const dir = path.join(OUT, slug);
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(path.join(dir, 'raw'), { recursive: true });
	const notes = [];
	const context = await (await getBrowser()).newContext({ viewport, deviceScaleFactor: 2 });
	if (spec.init) await context.addInitScript(spec.init);
	const page = await context.newPage();
	const taken = [];
	const snap = async (kind = 'state') => {
		if (kind === 'state' && taken.filter((t) => t.kind === 'state').length >= 40) return;
		const file = path.join(dir, 'raw', String(taken.length).padStart(3, '0') + '.jpg');
		try { await page.screenshot({ path: file, type: 'jpeg', quality: 90 }); taken.push({ file, kind }); } catch (e) { notes.push('snap failed'); }
	};
	const open = async (url) => { for (let i = 0; i < 3; i++) { try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {}); return true; } catch { await page.waitForTimeout(2500); } } return false; };

	if (spec.url && spec.run) {
		if (await open(spec.url)) {
			await page.waitForTimeout(spec.settle ?? 4000);
			// stands in for the recorder's clock: nothing is filmed, so a step only needs a moment
			const clock = { at: 0, painted: 0, freeze() {}, release() {}, paintedAfter: () => new Promise((r) => setTimeout(r, 6)) };
			const m = mouse(page, (s) => notes.push(s.trim()), clock);
			m.cut = async (fn) => fn();
			if (spec.prepare) await spec.prepare(page, m).catch((e) => notes.push('prepare: ' + String(e).split('\n')[0].slice(0, 80)));
			await page.mouse.move(m.x, m.y);
			const wait = m.wait;
			m.wait = async (ms) => { await wait(ms); if (ms >= 300) await snap(); }; // the page has settled: take a picture
			await snap();
			try { await spec.run(page, m); } catch (e) { notes.push('run stopped: ' + String(e).split('\n')[0].slice(0, 100)); }
			await page.waitForTimeout(500);
			await snap();
		} else notes.push('could not open ' + spec.url);
	}
	for (const extra of pages[slug] || []) {
		if (!(await open(extra.url))) { notes.push('could not open ' + extra.url); continue; }
		await page.waitForTimeout(extra.wait ?? 4500);
		if (extra.before) await extra.before(page).catch((e) => notes.push('before: ' + String(e).split('\n')[0].slice(0, 80)));
		if (extra.scroll) { await page.evaluate((y) => scrollTo(0, y), extra.scroll); await page.waitForTimeout(1200); }
		await snap(extra.trim ? 'page-trim' : 'page');
	}
	await context.close();

	// keep the pictures of the scripted run that differ most; every extra page is kept
	const states = taken.filter((t) => t.kind === 'state');
	const keep = [];
	if (states.length) {
		const sig = await Promise.all(states.map((s) => tiny(s.file)));
		const want = Math.min(spec.shots ?? 4, states.length);
		const chosen = [states.length > 2 ? Math.floor(states.length / 3) : 0];
		while (chosen.length < want) {
			let best = -1, bestD = 0;
			for (let i = 0; i < states.length; i++) {
				if (chosen.includes(i)) continue;
				const d = Math.min(...chosen.map((c) => distance(sig[i], sig[c])));
				if (d > bestD) { bestD = d; best = i; }
			}
			// the rest look the same; a project with one view still gets its hover states, up to three pictures
			if (best < 0 || bestD < (chosen.length < 3 ? 0.3 : 2.2)) break;
			chosen.push(best);
		}
		chosen.sort((a, b) => a - b).forEach((i) => keep.push(states[i]));
	}
	keep.push(...taken.filter((t) => t.kind !== 'state'));

	// crop like the clip, and save
	const first = keep[0] && (await sharp(keep[0].file).metadata());
	const density = first ? first.width / viewport.width : 2;
	let crop = null;
	if (spec.crop === 'auto' && states.length) crop = await contentBox(keep.filter((k) => k.kind === 'state').map((k) => k.file), { width: first.width, height: first.height }, 26 * density);
	else if (spec.crop && spec.crop !== 'auto') crop = { x: spec.crop.x * density, y: spec.crop.y * density, w: spec.crop.w * density, h: spec.crop.h * density };
	let n = 0;
	for (const k of keep) {
		const out = path.join(dir, String(++n).padStart(2, '0') + '.jpg');
		let img = sharp(k.file);
		if (k.kind === 'state' && crop) img = img.extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: even(crop.w), height: even(crop.h) });
		if (k.kind === 'page-trim') {
			const px = await sharp(k.file).extract({ left: 6, top: 6, width: 1, height: 1 }).raw().toBuffer();
			try { const t = await sharp(k.file).trim({ background: { r: px[0], g: px[1], b: px[2] }, threshold: 20 }).toBuffer(); img = sharp(t).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: px[0], g: px[1], b: px[2] } }); } catch {}
		}
		await img.jpeg({ quality: 90 }).toFile(out);
	}
	fs.rmSync(path.join(dir, 'raw'), { recursive: true, force: true });
	return { slug, taken: taken.length, kept: n, notes };
}

(async () => {
	const wanted = process.argv.slice(2);
	const jobs = wanted.length ? wanted : [...new Set([...Object.keys(scenarios), ...Object.keys(pages)])];
	const worker = async () => { while (jobs.length) { const slug = jobs.shift(); let r; try { r = await shoot(slug); } catch (e) { r = { slug, error: String(e).split('\n')[0].slice(0, 160) }; } console.log(JSON.stringify(r)); fs.appendFileSync(path.join(OUT, 'log.txt'), JSON.stringify(r) + '\n'); } };
	fs.mkdirSync(OUT, { recursive: true });
	await Promise.all(Array.from({ length: Number(process.env.JOBS || 2) }, worker));
	await closeBrowser();
	process.exit(0);
})();
