// Writes the projects in entries.js into the portfolio: a content file each, plus a thumbnail and
// the page images made from the screenshots.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const site = path.resolve(__dirname, '../..'); // the portfolio repository this folder sits in
const entries = require(process.env.ENTRIES || './entries.js');
const contentDir = path.join(site, 'src/content/more');

// The wording of every page comes from texts.js. The credit line that closes the Infogr8 pages
// stays as it is in the entry.
const texts = require('./texts.js');
// The date of each project is the last stretch of work in its repository (see meta/apply-dates.js).
const dates = fs.existsSync(path.join(__dirname, 'dates.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'dates.json'), 'utf8')) : {};
// Screenshots of the project in use (vid/stills.js), and which of them each page shows.
const shots = require('./shots.js');
const shotsDir = path.join(__dirname, '..', 'shots');
function shotFiles(slug) {
	const rule = shots[slug] || {};
	const dir = path.join(shotsDir, slug);
	const taken = rule.none || !fs.existsSync(dir) ? [] : fs.readdirSync(dir).filter((f) => /^\d+\.jpg$/.test(f)).sort().filter((f) => !(rule.skip || []).includes(parseInt(f, 10))).map((f) => ({ file: path.join(dir, f) }));
	return [...taken, ...(rule.extra || []).map((f) => ({ file: path.resolve(__dirname, '..', f) }))];
}
// Tags after going through each project's code and the job-post skills (see meta/apply-tags.js).
const tagList = fs.existsSync(path.join(__dirname, 'tags.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'tags.json'), 'utf8')) : {};
for (const e of entries) {
	if (dates[e.slug]) e.date = dates[e.slug];
	if (tagList[e.slug]) e.tags = tagList[e.slug];
	const text = texts[e.slug];
	if (!text) throw new Error('no text for ' + e.slug);
	const credit = /\n\n((?:In partnership with|A Friday experiment at) \[infogr8\][^\n]*)$/.exec(e.body)?.[1];
	e.description = text.description;
	e.body = text.body + (credit ? '\n\n' + credit : '');
	e.after = text.after || ''; // goes below the pictures
}

async function prepare({ file, trim, crop }) {
	if (!fs.existsSync(file)) throw new Error('missing screenshot ' + file);
	if (crop) return sharp(file).extract(crop).toBuffer();
	if (!trim) return fs.readFileSync(file);
	// the page colour, taken from the top-left corner
	const px = await sharp(file).extract({ left: 3, top: 3, width: 1, height: 1 }).raw().toBuffer();
	const background = { r: px[0], g: px[1], b: px[2] };
	let out;
	try {
		out = await sharp(file).trim({ background, threshold: 20 }).toBuffer({ resolveWithObject: true });
	} catch {
		return fs.readFileSync(file);
	}
	if (out.info.width < 120 || out.info.height < 80) return fs.readFileSync(file);
	const pad = 28;
	// keep a small chart from being stretched in the grid: give it room at the sides instead
	const side = Math.max(pad, Math.ceil((640 - out.info.width) / 2));
	return sharp(out.data).extend({ top: pad, bottom: pad, left: side, right: side, background }).toBuffer();
}

const yaml = (value) => JSON.stringify(value);

(async () => {
	const slugs = new Set();
	const existing = new Set(fs.readdirSync(path.join(site, 'src/content/projects')).map((f) => f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')));
	for (const e of entries) {
		const n = e.description.length;
		if (n > 160 || n < 30) throw new Error(`${e.slug}: description is ${n} characters`);
		if (slugs.has(e.slug) || existing.has(e.slug)) throw new Error('slug taken: ' + e.slug);
		slugs.add(e.slug);
	}

	let clips = 0;
	for (const e of entries) {
		const dir = path.join(site, 'static/images/projects', e.slug);
		if (fs.existsSync(dir) && fs.readdirSync(dir).some((f) => !/^((thumbnail|poster|film|walk|\d+)\.webp|(thumbnail|video|film|walk)\.mp4|thumbnail\.small\.mp4)$/.test(f))) throw new Error('image folder already used: ' + dir);
		fs.mkdirSync(dir, { recursive: true });
		for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));

		// A recorded clip of the live page replaces the first still: a small one on the card, a larger one on the page.
		// recordings live in one of these folders, by round
		const clipDir = e.clip ? path.resolve(__dirname, '..', e.clip) : ['../vid/out', '../vid/out-sel2', '../vid/out-sel2x'].map((d) => path.join(__dirname, d, e.slug)).find((d) => fs.existsSync(path.join(d, 'video.mp4'))) || '';
		const clip = Boolean(clipDir) && !e.noClip;
		let video = '';
		if (clip) {
			for (const f of ['thumbnail.mp4', 'video.mp4', 'poster.webp']) fs.copyFileSync(path.join(clipDir, f), path.join(dir, f));
			// how wide the recorded area is on the page (the files themselves have twice the pixels, for retina screens)
			const recorded = fs.existsSync(path.join(clipDir, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(clipDir, 'meta.json'), 'utf8')).width : (await sharp(path.join(clipDir, 'poster.webp')).metadata()).width;
			const width = Math.min(960, recorded);
			// the same block the other project pages open with; the clip is never drawn larger than it was recorded
			video = `<div style="margin-bottom:60px;overflow:hidden;width:100%;display:flex;justify-content:center">\n<video style="width:100%;max-width:${width}px;" poster="/images/projects/${e.slug}/poster.webp" autoplay loop muted playsinline>\n  <source src="/images/projects/${e.slug}/video.mp4" type="video/mp4">\n</video>\n</div>`;
			clips++;
		}
		// other files the page refers to by name (a second video, its poster)
		for (const file of e.files || []) fs.copyFileSync(path.resolve(__dirname, '..', file.from), path.join(dir, file.to));
		// the page's pictures: screenshots of the project in use, then its other pages. The first still
		// only stays when no clip replaces it (or the clip shows something else).
		const own = clip && !shots[e.slug]?.keepFirst ? e.images.slice(1) : e.images;
		const stills = (clip ? [...(shots[e.slug]?.keepFirst ? own : []), ...shotFiles(e.slug), ...(shots[e.slug]?.keepFirst ? [] : own)] : [...own, ...shotFiles(e.slug)]).slice(0, 9);

		const urls = [];
		for (let i = 0; i < stills.length; i++) {
			const buffer = await prepare(stills[i]);
			if (i === 0 && !clip) await sharp(buffer).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, 'thumbnail.webp'));
			await sharp(buffer).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, `${i + 1}.webp`));
			urls.push(`/images/projects/${e.slug}/${i + 1}.webp`);
		}

		const links = [e.live && `[Live version](${e.live})`, e.code && `[Code on GitHub](${e.code})`].filter(Boolean).join(' · ');
		const gallery = (list) => `<div class="gallery" data-columns="${e.columns || (list.length >= 5 ? 3 : 2)}">\n${list.map((u) => `\t<img src="${u}">`).join('\n')}\n</div>`;
		const [first, ...rest] = urls;
		const pictures = clip
			? (urls.length >= 3 ? gallery(urls) : urls.map((u) => `![](${u})`).join('\n\n'))
			: rest.length >= 2
				? `![](${first})\n\n${gallery(rest)}`
				: urls.map((u) => `![](${u})`).join('\n\n');

		const front = [
			'---',
			`title: ${yaml(e.title)}`,
			...(e.hidden ? ['hidden: true'] : []), // kept off the site until the line is removed (see content.js)
			`year: ${e.date.slice(0, 4)}`,
			`tags: [${e.tags.join(', ')}]`,
			`subtitle: ${yaml(e.tech)}`,
			`description: ${yaml(e.description)}`,
			`featured_image: '/images/projects/${e.slug}/thumbnail.${clip ? 'mp4' : 'webp'}'`,
			'---'
		].join('\n');
		const body = [video, e.body, links, pictures, e.after].filter(Boolean).join('\n\n');
		// the date is part of the file name: remove the page written under an earlier date
		for (const f of fs.readdirSync(contentDir)) if (f.replace(/^\d{4}-\d{2}-\d{2}-/, '') === e.slug + '.md') fs.unlinkSync(path.join(contentDir, f));
		fs.writeFileSync(path.join(contentDir, `${e.date}-${e.slug}.md`), `${front}\n\n${body}\n`);
	}
	const bytes = entries.reduce((sum, e) => sum + fs.readdirSync(path.join(site, 'static/images/projects', e.slug)).reduce((s, f) => s + fs.statSync(path.join(site, 'static/images/projects', e.slug, f)).size, 0), 0);
	console.log(`${entries.length} projects written, ${clips} with a clip, ${(bytes / 1e6).toFixed(1)} MB of images and video`);
})();
