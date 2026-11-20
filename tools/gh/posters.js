// The picture every card shows. For a card with a clip it is the first frame of the thumbnail video,
// saved next to it as a small .webp: the card shows it at once and fetches the clip only when it
// comes into view. For a card with a still image it is that image made small (blog thumbnails
// were up to 2.6 MB), unless it is small already.
// Also writes src/lib/server/posters.json (clip address -> picture address and size), which the
// site reads when it is built.     node gh/posters.js      (run after gh/generate.js)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');

const site = path.resolve(__dirname, '../..');
const content = path.join(site, 'src/content');
const out = path.join(site, 'src/lib/server/posters.json');
const WIDTH = 800; // a card is drawn up to 500px wide; the clip takes over as soon as it plays

(async () => {
	const before = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
	const map = {};
	let made = 0, stills = 0, bytes = 0, smallBytes = 0;
	for (const collection of fs.readdirSync(content)) {
		const dir = path.join(content, collection);
		if (!fs.statSync(dir).isDirectory()) continue;
		for (const file of fs.readdirSync(dir)) {
			if (!file.endsWith('.md')) continue;
			if (/^hidden:\s*true\s*$/m.test(fs.readFileSync(path.join(dir, file), 'utf8').split('\n---')[0])) continue; // hidden pages get theirs when they are shown again
			const featured = (/^featured_image:\s*['"]?([^'"\n]+?)['"]?\s*$/m.exec(fs.readFileSync(path.join(dir, file), 'utf8')) || [])[1];
			if (!featured || map[featured] || /^https?:/.test(featured)) continue;
			if (/\.(png|jpe?g|webp)$/i.test(featured)) {
				// a still image: a copy at card size, or the image itself when it is light enough
				const original = path.join(site, 'static', featured);
				if (!fs.existsSync(original)) continue;
				const meta = await sharp(original).metadata();
				if (meta.width <= WIDTH && fs.statSync(original).size <= 120e3) { map[featured] = { src: featured, width: meta.width, height: meta.height }; continue; }
				const small = featured.replace(/\.\w+$/, '.card.webp');
				const made = await sharp(original).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 76 }).toFile(path.join(site, 'static', small));
				map[featured] = { src: small, width: made.width, height: made.height };
				stills++; bytes += made.size;
				continue;
			}
			const clip = /\.mp4$/i.test(featured) ? featured : null;
			if (!clip) continue;
			const source = path.join(site, 'static', clip);
			if (!fs.existsSync(source)) { console.log('missing clip', clip); continue; }
			// thumbnail.mp4 -> thumbnail.webp, unless a different picture already has that name
			let poster = clip.replace(/\.mp4$/, '.webp');
			if (fs.existsSync(path.join(site, 'static', poster)) && before[clip]?.src !== poster) poster = clip.replace(/\.mp4$/, '.poster.webp');
			const target = path.join(site, 'static', poster);
			const frame = execFileSync(ffmpeg, ['-loglevel', 'error', '-i', source, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 });
			const info = await sharp(frame).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 70 }).toFile(target);
			// a small copy of the clip for phones, where a card is under 200px wide: far fewer bytes, and
			// several of them can play at once without keeping the phone busy
			const small = clip.replace(/\.mp4$/, '.small.mp4');
			const smallFile = path.join(site, 'static', small);
			if (!fs.existsSync(smallFile) || fs.statSync(smallFile).mtimeMs < fs.statSync(source).mtimeMs) {
				execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', source, '-vf', "scale='min(480,iw)':-2:flags=lanczos,fps=30", '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', smallFile]);
			}
			smallBytes += fs.statSync(smallFile).size;
			map[clip] = { src: poster, width: info.width, height: info.height, small };
			made++; bytes += info.size;
		}
	}
	fs.writeFileSync(out, JSON.stringify(map, null, 1) + '\n');
	console.log(`${made} clip stills and ${stills} smaller card images, ${(bytes / 1e6).toFixed(2)} MB in all; ${made} phone-size clips, ${(smallBytes / 1e6).toFixed(1)} MB`);
})();
