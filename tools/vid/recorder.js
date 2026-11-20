// Records a short interaction clip of a live page: drives the page with a visible cursor, captures
// the frames the browser paints, and encodes them as two small H.264 files (card clip + page clip).
//
// The clip has its own clock, so it is smooth and quick however slowly a page redraws:
//   - cursor moves and drags are stepped: 60 steps per second of clip, and each step waits for the
//     page to paint before the next, so every step is a frame of its own;
//   - everything else (pauses, the page's own animations, typing) is recorded as it happens and
//     played back SPEED times faster.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');

const SPEED = 1.6; // pauses, animations and typing play this much faster than recorded
const TEMPO = 0.6; // a cursor move takes this share of the time the scenario gives it
const STEP = 1 / 60; // seconds of clip per cursor step
// Pages are recorded at twice the pixel density, so the clips stay sharp on a retina screen:
// a card is drawn up to 500px wide (1000 device pixels), the page clip up to 960px.
const DENSITY = Number(process.env.DENSITY || 2);
const PAGE = { width: 1280, fps: 30, crf: 28 };
const CARD = { width: 1000, fps: 30, crf: 30 };

// A drawn cursor, since a headless browser has none. Runs in every frame of the page.
const cursorScript = `(() => {
	if (window.__cursor) return;
	window.__cursor = true;
	const make = () => {
		const c = document.createElement('div');
		c.id = '__clip_cursor';
		c.style.cssText = 'position:fixed;left:0;top:0;width:24px;height:24px;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px)';
		c.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" style="position:absolute;left:0;top:0;overflow:visible"><circle id="__ring" cx="4" cy="3" r="0" fill="rgba(12,93,242,0.28)" stroke="rgba(12,93,242,0.8)" stroke-width="1.5"/><path d="M4 2.5l13.5 11h-7l-3.4 7.4z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
		(document.documentElement || document.body).appendChild(c);
		const ring = c.querySelector('#__ring');
		addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 3) + 'px)'; }, true);
		addEventListener('mousedown', () => { ring.setAttribute('r', '13'); }, true);
		addEventListener('mouseup', () => { setTimeout(() => ring.setAttribute('r', '0'), 140); }, true);
		document.addEventListener('mouseleave', () => { c.style.transform = 'translate(-200px,-200px)'; });
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', make); else make();
})();`;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** The clip's clock: runs SPEED times faster than real time, or stands still while stepped. */
function makeClock() {
	const c = {
		at: 0,
		stepped: false,
		since: Date.now(),
		painted: 0,
		waiting: [],
		latency: 20,
		now: () => (c.stepped ? c.at : c.at + (Date.now() - c.since) / 1000 / SPEED),
		freeze() {
			if (c.stepped) return;
			c.at = c.now();
			c.stepped = true;
		},
		release() {
			if (!c.stepped) return;
			c.since = Date.now();
			c.stepped = false;
		},
		/** Called for every frame the browser paints. */
		paint() {
			c.painted++;
			const waiting = c.waiting;
			c.waiting = [];
			waiting.forEach((resolve) => resolve());
		},
		/** Resolves once a frame newer than `seen` has been painted, or after a few frame-times. */
		paintedAfter(seen) {
			if (c.painted > seen) return Promise.resolve();
			const asked = Date.now();
			return new Promise((resolve) => {
				const timer = setTimeout(resolve, Math.min(320, Math.max(40, c.latency * 3)));
				c.waiting.push(() => {
					clearTimeout(timer);
					c.latency = c.latency * 0.7 + (Date.now() - asked) * 0.3;
					resolve();
				});
			});
		}
	};
	return c;
}

/** Mouse helpers that move the way a hand does, so the clip reads as someone using the page. */
function mouse(page, log, clock) {
	const m = {
		x: 640,
		y: 420,
		wait: (ms) => page.waitForTimeout(ms),
		async move(x, y, ms = 520) {
			const [x0, y0] = [m.x, m.y];
			if (Math.hypot(x - x0, y - y0) < 2) return;
			const seconds = (ms * TEMPO) / 1000;
			const steps = Math.max(5, Math.round(seconds / STEP));
			clock.freeze();
			let last = [Math.round(x0), Math.round(y0)];
			for (let i = 1; i <= steps; i++) {
				const t = ease(i / steps);
				const point = [Math.round(x0 + (x - x0) * t), Math.round(y0 + (y - y0) * t)];
				clock.at += seconds / steps;
				if (point[0] === last[0] && point[1] === last[1]) continue; // nothing to paint
				last = point;
				const seen = clock.painted;
				await page.mouse.move(point[0], point[1]);
				await clock.paintedAfter(seen);
			}
			clock.release();
			m.x = x;
			m.y = y;
		},
		async click(x, y, after = 450) {
			await m.move(x, y);
			await m.wait(140);
			await page.mouse.down();
			await m.wait(70);
			await page.mouse.up();
			await m.wait(after);
		},
		async drag(x1, y1, x2, y2, ms = 900) {
			await m.move(x1, y1);
			await m.wait(120);
			await page.mouse.down();
			await m.wait(60);
			await m.move(x2, y2, ms);
			await m.wait(80);
			await page.mouse.up();
			await m.wait(250);
		},
		async wheel(x, y, dy, steps = 10) {
			await m.move(x, y, 350);
			for (let i = 0; i < steps; i++) {
				await page.mouse.wheel(0, dy / steps);
				await m.wait(45);
			}
			await m.wait(350);
		},
		/** Scrolls by dy pixels, stepped like a cursor move, so every step of the scroll is a frame. */
		async scroll(dy, ms = 900) {
			const seconds = (ms * TEMPO) / 1000;
			const steps = Math.max(8, Math.round(seconds / STEP));
			clock.freeze();
			let done = 0;
			for (let i = 1; i <= steps; i++) {
				const target = Math.round(dy * ease(i / steps));
				clock.at += seconds / steps;
				if (target === done) continue;
				const seen = clock.painted;
				await page.mouse.wheel(0, target - done);
				done = target;
				await clock.paintedAfter(seen);
			}
			clock.release();
			await m.wait(250);
		},
		/** Centre of an element (selector or locator), or null when it is not on the screen. */
		async centre(target, nth = 0) {
			const locator = typeof target === 'string' ? page.locator(target).nth(nth) : target;
			const box = await locator.boundingBox({ timeout: 2500 }).catch(() => null);
			if (!box) {
				log('  not found: ' + (typeof target === 'string' ? target : 'locator'));
				return null;
			}
			return [box.x + box.width / 2, box.y + box.height / 2, box];
		},
		async to(target, nth = 0, dwell = 400) {
			const c = await m.centre(target, nth);
			if (!c) return false;
			await m.move(c[0], c[1]);
			await m.wait(dwell);
			return true;
		},
		async clickOn(target, nth = 0, after = 600) {
			const c = await m.centre(target, nth);
			if (!c) return false;
			await m.click(c[0], c[1], after);
			return true;
		},
		/** Screen positions of a spread of the marks matching a selector. */
		async points(selector, count = 6, within = null) {
			return page.evaluate(
				({ selector, count, within }) => {
					const seen = [];
					for (const el of document.querySelectorAll(selector)) {
						const r = el.getBoundingClientRect();
						const x = r.left + r.width / 2;
						const y = r.top + r.height / 2;
						if (r.width < 2 || r.height < 2 || x < 12 || y < 12 || x > innerWidth - 12 || y > innerHeight - 12) continue;
						if (within && (x < within[0] || y < within[1] || x > within[2] || y > within[3])) continue;
						const top = document.elementFromPoint(x, y);
						if (top && (top === el || el.contains(top) || top.contains(el) || top.closest('svg') === el.closest('svg'))) seen.push([x, y]);
					}
					if (seen.length <= count) return seen;
					const picked = [];
					for (let i = 0; i < count; i++) picked.push(seen[Math.round((i * (seen.length - 1)) / (count - 1))]);
					return picked;
				},
				{ selector, count, within }
			);
		},
		/** Hover a spread of the marks matching a selector, pausing on each. */
		async sweep(selector, count = 6, dwell = 430, within = null) {
			const points = await m.points(selector, count, within);
			if (!points.length) log('  nothing to sweep: ' + selector);
			for (const [x, y] of points) {
				await m.move(x, y, 420);
				await m.wait(dwell);
			}
			return points.length;
		},
		/** Drag the thumb of an <input type=range> to a share of its track (0..1). */
		async slide(selector, share, ms = 900, nth = 0) {
			const info = await page.evaluate(([selector, nth]) => {
				const el = document.querySelectorAll(selector)[nth];
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { left: r.left, top: r.top, width: r.width, height: r.height, at: (el.value - el.min) / (el.max - el.min) };
			}, [selector, nth]);
			if (!info) return log('  no slider: ' + selector);
			const y = info.top + info.height / 2;
			const pad = 8;
			const xAt = (s) => info.left + pad + s * (info.width - pad * 2);
			await m.drag(xAt(info.at), y, xAt(share), y, ms);
		}
	};
	return m;
}

let browser;
async function getBrowser() {
	if (!browser) browser = await chromium.launch({ channel: process.env.CHANNEL || undefined, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--enable-gpu', '--use-angle=metal', '--force-device-scale-factor=' + DENSITY] }); // the flag is what makes the captured frames DENSITY times the page size
	return browser;
}
async function closeBrowser() {
	if (browser) await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 5000))]);
	browser = null;
}

/** The area the content occupies across a sample of frames, padded. */
async function contentBox(files, size, pad = 26) {
	const sample = files.filter((_, i) => i % Math.max(1, Math.floor(files.length / 10)) === 0);
	let box = null;
	for (const file of sample) {
		const px = await sharp(file).extract({ left: 3, top: 3, width: 1, height: 1 }).raw().toBuffer();
		try {
			const { info } = await sharp(file).trim({ background: { r: px[0], g: px[1], b: px[2] }, threshold: 22 }).toBuffer({ resolveWithObject: true });
			const b = { x1: -info.trimOffsetLeft, y1: -info.trimOffsetTop, x2: -info.trimOffsetLeft + info.width, y2: -info.trimOffsetTop + info.height };
			box = box ? { x1: Math.min(box.x1, b.x1), y1: Math.min(box.y1, b.y1), x2: Math.max(box.x2, b.x2), y2: Math.max(box.y2, b.y2) } : b;
		} catch {}
	}
	if (!box) return null;
	const x = Math.max(0, box.x1 - pad);
	const y = Math.max(0, box.y1 - pad);
	return { x, y, w: Math.min(size.width, box.x2 + pad) - x, h: Math.min(size.height, box.y2 + pad) - y };
}

/**
 * Drives the page and saves the frames with their times (frames.txt, in ffmpeg's concat format).
 * @param {string} slug
 * @param {{ url: string, viewport?: {width:number,height:number}, settle?: number, prepare?: Function,
 *           run: Function, crop?: 'auto' | {x:number,y:number,w:number,h:number} }} spec
 */
async function record(slug, spec, outDir) {
	const lines = [];
	const log = (s) => lines.push(s);
	const viewport = spec.viewport || { width: 1280, height: 800 };
	const dir = path.resolve(outDir, slug);
	fs.rmSync(dir, { recursive: true, force: true });
	fs.mkdirSync(path.join(dir, 'frames'), { recursive: true });

	const context = await (await getBrowser()).newContext({ viewport, deviceScaleFactor: DENSITY });
	await context.addInitScript(cursorScript);
	if (spec.init) await context.addInitScript(spec.init); // extra page set-up a scenario needs
	const page = await context.newPage();
	let loaded = false;
	for (let attempt = 0; attempt < 3 && !loaded; attempt++) {
		try {
			await page.goto(spec.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
			loaded = true;
		} catch (e) {
			log('  load failed, retrying: ' + String(e).split('\n')[0].slice(0, 80));
			await page.waitForTimeout(3000);
		}
	}
	if (!loaded) {
		await context.close();
		return { slug, ok: false, log: lines };
	}
	await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(spec.settle ?? 4000);

	const clock = makeClock();
	const m = mouse(page, log, clock);
	if (spec.prepare) await spec.prepare(page, m).catch((e) => log('  prepare: ' + String(e).split('\n')[0].slice(0, 100)));
	await page.mouse.move(m.x, m.y);

	const cdp = await context.newCDPSession(page);
	const frames = [];
	let offCamera = false;
	// m.cut(fn) does something off camera: the clip jumps from before it to after it
	m.cut = async (fn) => {
		clock.freeze();
		offCamera = true;
		try {
			await fn();
		} finally {
			await page.waitForTimeout(150);
			offCamera = false;
			clock.release();
		}
	};
	cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
		cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
		clock.paint();
		if (offCamera) return;
		const t = clock.now();
		const last = frames[frames.length - 1];
		if (last && t - last.t < 0.004) {
			fs.writeFileSync(last.file, Buffer.from(data, 'base64')); // the same instant: keep the newer picture
			return;
		}
		const file = path.join(dir, 'frames', String(frames.length).padStart(5, '0') + '.jpg');
		fs.writeFileSync(file, Buffer.from(data, 'base64'));
		frames.push({ file, t });
	});
	clock.at = 0;
	clock.since = Date.now();
	await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1, maxWidth: viewport.width * DENSITY, maxHeight: viewport.height * DENSITY });
	await page.waitForTimeout(400);
	try {
		await spec.run(page, m);
	} catch (e) {
		log('  run stopped: ' + String(e).split('\n')[0].slice(0, 120));
	}
	await page.waitForTimeout(500);
	await cdp.send('Page.stopScreencast').catch(() => {});
	await page.waitForTimeout(200);
	await context.close();
	if (frames.length < 5) return { slug, ok: false, log: [...lines, '  only ' + frames.length + ' frames'] };

	// each frame is held until the next
	const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.004, (frames[i + 1]?.t ?? f.t + 0.3) - f.t).toFixed(4)}`).join('\n') + `\nfile '${frames[frames.length - 1].file}'\n`;
	fs.writeFileSync(path.join(dir, 'frames.txt'), list);
	return { slug, ok: true, ...(await encodeClip(dir, spec)), log: lines };
}

/** Encodes a recording from its saved frames: video.mp4, thumbnail.mp4 and poster.webp. */
async function encodeClip(dir, spec = {}) {
	const viewport = spec.viewport || { width: 1280, height: 800 };
	const lines = fs.readFileSync(path.join(dir, 'frames.txt'), 'utf8').trim().split('\n');
	const files = [];
	const holds = [];
	for (let i = 0; i + 1 < lines.length; i += 2) {
		files.push(lines[i].slice(6, -1));
		holds.push(parseFloat(lines[i + 1].split(' ')[1]));
	}
	const seconds = holds.reduce((a, b) => a + b, 0);
	// how many different pictures a second the clip has while something moves
	const moving = holds.filter((h) => h < 0.1);
	const motionFps = moving.length ? moving.length / moving.reduce((a, b) => a + b, 0) : 0;

	// the frames are `density` times the page size; crops in the scenarios are in page pixels
	const frame = await sharp(files[0]).metadata();
	const density = frame.width / viewport.width;
	const scaled = (c) => ({ x: c.x * density, y: c.y * density, w: c.w * density, h: c.h * density });
	let crop = spec.crop === 'auto' ? await contentBox(files, { width: frame.width, height: frame.height }, 26 * density) : spec.crop ? scaled(spec.crop) : null;
	if (!crop) crop = { x: 0, y: 0, w: frame.width, h: frame.height };
	const even = (n) => Math.floor(n / 2) * 2;
	const cropFilter = `crop=${even(crop.w)}:${even(crop.h)}:${Math.round(crop.x)}:${Math.round(crop.y)}`;
	// cards of the longer clips play a little faster still, so that a card stays around ten seconds
	const cardSpeed = Math.min(1.5, Math.max(1, seconds / 10));
	const encode = (name, o, pts) => {
		const out = path.join(dir, name);
		execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt'),
			'-vf', `${cropFilter},${pts}scale='min(${o.width},iw)':-2:flags=lanczos,fps=${o.fps},format=yuv420p`,
			'-c:v', 'libx264', '-preset', 'veryslow', '-crf', String(o.crf), '-profile:v', 'high', '-x264-params', 'keyint=300:min-keyint=30',
			'-movflags', '+faststart', '-an', out]);
		return fs.statSync(out).size;
	};
	// a scenario may ask for stronger compression (`squeeze`: points added to the quality factor)
	const squeeze = spec.squeeze || 0;
	const pageBytes = encode('video.mp4', { ...PAGE, crf: PAGE.crf + squeeze }, '');
	const cardBytes = encode('thumbnail.mp4', { ...CARD, crf: CARD.crf + squeeze }, cardSpeed > 1.001 ? `setpts=PTS/${cardSpeed.toFixed(3)},` : '');
	await sharp(files[Math.floor(files.length / 3)])
		.extract({ left: Math.round(crop.x), top: Math.round(crop.y), width: even(crop.w), height: even(crop.h) })
		.resize({ width: PAGE.width, withoutEnlargement: true })
		.webp({ quality: 76 })
		.toFile(path.join(dir, 'poster.webp'));
	// how wide the clip is in page pixels: it is never shown larger than that
	fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ width: Math.round(crop.w / density), seconds: +seconds.toFixed(1) }));
	return { seconds: +seconds.toFixed(1), cardSeconds: +(seconds / cardSpeed).toFixed(1), frames: files.length, motionFps: Math.round(motionFps), crop: `${even(crop.w)}x${even(crop.h)}`, pageKB: Math.round(pageBytes / 1024), cardKB: Math.round(cardBytes / 1024) };
}

module.exports = { record, encodeClip, closeBrowser, getBrowser, contentBox, mouse };
