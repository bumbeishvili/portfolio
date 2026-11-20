// Adds the extra pictures (shots/<slug>/NN.jpg) to older, hand-written project pages.
// Can be run again: the pictures are written as shot-N.webp and the page block is replaced.
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const site = require('path').resolve(__dirname, '../..');
const jobs = [
	{ page: 'projects/2009-07-24-names-line.md', slug: 'names-line', use: [2, 3] },
	{ page: 'gl/2010-07-20-x-wave.md', slug: 'x-wave', use: [1], into: true },
	{ page: 'gl/2007-11-23-threejs-journey-particles-cursor-animation-39.md', slug: 'threejs-journey-particles-cursor-animation-39', use: [1, 2], into: true },
	{ page: 'notable-collaborations/2009-11-01-sequoia-org-chart.md', slug: 'sequoia-org-chart', use: [1, 2, 3] },
	{ page: 'notable-collaborations/2009-11-01-mastercard-foundation.md', slug: 'mastercard-foundation', use: [2, 3, 5] },
	{ page: 'more/2009-07-01-thunes-live-transactions.md', slug: 'thunes-live-transactions', use: [1, 3, 4] }, // 4 is the picture from the former Dtone - Firing Map page
	{ page: 'more/2009-07-02-calendar-heatmap.md', slug: 'calendar-heatmap', use: [1, 3] }
];
(async () => {
	const only = process.argv.slice(2); // slugs, to redo some pages only
	for (const job of jobs) {
		if (only.length && !only.includes(job.slug)) continue;
		const dir = path.join(site, 'static/images/projects', job.slug);
		fs.mkdirSync(dir, { recursive: true });
		const urls = [];
		for (let i = 0; i < job.use.length; i++) {
			const src = path.join(__dirname, '..', 'shots', job.slug, String(job.use[i]).padStart(2, '0') + '.jpg');
			await sharp(src).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, `shot-${i + 1}.webp`));
			urls.push(`/images/projects/${job.slug}/shot-${i + 1}.webp`);
		}
		const file = path.join(site, 'src/content', job.page);
		let text = fs.readFileSync(file, 'utf8');
		text = text.replace(/\n*<div class="gallery" data-columns="\d" data-shots>[\s\S]*?<\/div>\n?/g, '\n').replace(/\n\t<img src="[^"]*\/shot-\d\.webp">/g, '');
		const imgs = urls.map((u) => `\t<img src="${u}">`).join('\n');
		if (job.into) {
			// the page already has a gallery: the pictures join it
			if (!/<div class="gallery"[^>]*>/.test(text)) throw new Error('no gallery in ' + job.page);
			text = text.replace(/(<div class="gallery"[^>]*>[\s\S]*?)(\n<\/div>)/, `$1\n${imgs}$2`);
		} else {
			const block = `<div class="gallery" data-columns="${urls.length >= 3 ? 3 : 2}" data-shots>\n${imgs}\n</div>`;
			// before the trailing spacer lines, if the page ends with them
			const m = /((?:\s*<br\s*\/?>)+\s*)$/.exec(text);
			text = m ? text.slice(0, m.index).replace(/\s+$/, '') + '\n\n' + block + '\n' + m[1].replace(/^\s*\n/, '\n') : text.replace(/\s+$/, '') + '\n\n' + block + '\n';
		}
		fs.writeFileSync(file, text);
		console.log(job.page, urls.length);
	}
})();
