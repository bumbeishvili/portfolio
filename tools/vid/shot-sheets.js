// Review sheets of the screenshots in shots/<slug>/: one row per project.
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'shots');
const only = fs.existsSync(path.join(dir, '_only.json')) ? JSON.parse(fs.readFileSync(path.join(dir, '_only.json'), 'utf8')) : null;
const slugs = fs.readdirSync(dir).filter((s) => fs.statSync(path.join(dir, s)).isDirectory() && (!only || only.includes(s))).sort();
const W = 300, H = 190, LABEL = 22, PER = 9, COLS = 7;
(async () => {
	fs.mkdirSync(path.join(dir, '_sheets'), { recursive: true });
	for (let page = 0; page * PER < slugs.length; page++) {
		const part = slugs.slice(page * PER, page * PER + PER);
		const layers = [];
		for (let r = 0; r < part.length; r++) {
			const files = fs.readdirSync(path.join(dir, part[r])).filter((f) => /\.jpg$/.test(f)).sort().slice(0, COLS);
			layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * COLS}" height="${LABEL}"><text x="4" y="16" font-family="Helvetica" font-size="15" fill="#111">${part[r]} (${files.length})</text></svg>`), left: 0, top: r * (H + LABEL) });
			for (let c = 0; c < files.length; c++) {
				const input = await sharp(path.join(dir, part[r], files[c])).resize({ width: W - 6, height: H - 6, fit: 'contain', background: '#ddd' }).toBuffer();
				layers.push({ input, left: c * W + 3, top: r * (H + LABEL) + LABEL + 3 });
			}
		}
		await sharp({ create: { width: W * COLS, height: part.length * (H + LABEL), channels: 3, background: '#fff' } }).composite(layers).jpeg({ quality: 80 }).toFile(path.join(dir, '_sheets', `sheet-${page + 1}.jpg`));
	}
	console.log(Math.ceil(slugs.length / PER), 'sheets');
})();
