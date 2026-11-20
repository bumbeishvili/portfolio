// Contact sheets of the recordings: six moments from each clip in a row, to check what happened.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
(async () => {
	const wanted = process.argv.slice(2);
	const slugs = fs.readdirSync(process.env.OUTDIR || 'vid/out').filter((s) => fs.existsSync(`${process.env.OUTDIR || 'vid/out'}/${s}/frames.txt`) && (!wanted.length || wanted.includes(s)));
	const W = 300, PER = 6, N = 6;
	fs.rmSync('vid/strips', { recursive: true, force: true });
	fs.mkdirSync('vid/strips', { recursive: true });
	for (let s = 0; s * PER < slugs.length; s++) {
		const rows = [];
		for (const slug of slugs.slice(s * PER, s * PER + PER)) {
			const entries = fs.readFileSync(`${process.env.OUTDIR || 'vid/out'}/${slug}/frames.txt`, 'utf8').trim().split('\n');
			const frames = [];
			let t = 0;
			for (let i = 0; i + 1 < entries.length; i += 2) { frames.push({ file: entries[i].slice(6, -1), t }); t += parseFloat(entries[i + 1].split(' ')[1]); }
			const picks = Array.from({ length: N }, (_, i) => { const at = t * (0.08 + (0.86 * i) / (N - 1)); return frames.reduce((best, f) => (Math.abs(f.t - at) < Math.abs(best.t - at) ? f : best)); });
			const images = await Promise.all(picks.map((f) => sharp(f.file).resize({ width: W }).toBuffer({ resolveWithObject: true })));
			rows.push({ slug, images, h: Math.max(...images.map((i) => i.info.height)) });
		}
		const height = rows.reduce((sum, r) => sum + r.h + 22, 0);
		const composite = [];
		let y = 0;
		for (const r of rows) {
			composite.push({ input: Buffer.from(`<svg width="${W * N}" height="22"><rect width="100%" height="100%" fill="#222"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#fff">${r.slug}</text></svg>`), left: 0, top: y });
			r.images.forEach((img, i) => composite.push({ input: img.data, left: i * W, top: y + 22 }));
			y += r.h + 22;
		}
		await sharp({ create: { width: W * N, height, channels: 3, background: '#444' } }).composite(composite).jpeg({ quality: 78 }).toFile(`vid/strips/strip-${String(s).padStart(2, '0')}.jpg`);
	}
	console.log(slugs.length, 'clips ->', fs.readdirSync('vid/strips').join(' '));
})();
