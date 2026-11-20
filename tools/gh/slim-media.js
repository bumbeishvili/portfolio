// Makes the heavy pictures and clips of the pages lighter, without changing how they look on the page:
//   - an animated GIF becomes an animated WebP (same frames; an <img> shows it the same way)
//   - a large PNG or JPG becomes a WebP of the same size in pixels (at most 2400 wide)
//   - a page video over 3 MB is encoded again (same length and frame rate, at most 1920 wide)
// and the pages are pointed at the new files. A file is only replaced when the result is clearly
// smaller. The original is deleted only if the very same file is in the repository's history
// (at its old path, images/...); otherwise it is first copied to tools/originals/.
//      node gh/slim-media.js            what would change
//      node gh/slim-media.js --write    do it (run gh/posters.js afterwards)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');

const write = process.argv.includes('--write');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7); // gif | image | video
const site = path.resolve(__dirname, '../..');
const content = path.join(site, 'src/content');
const statics = path.join(site, 'static');
const keep = path.resolve(__dirname, '../originals');
const MB = (bytes) => (bytes / 1048576).toFixed(1);
// videos already encoded again: doing it twice would only lose quality
const doneFile = path.join(__dirname, 'slim-media.json');
const done = new Set(fs.existsSync(doneFile) ? JSON.parse(fs.readFileSync(doneFile, 'utf8')) : []);

// every picture and clip the pages mention, and the pages that mention it
const used = new Map();
const pages = [];
for (const collection of fs.readdirSync(content)) {
	const dir = path.join(content, collection);
	if (!fs.statSync(dir).isDirectory()) continue;
	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith('.md')) continue;
		const page = path.join(dir, file);
		pages.push(page);
		for (const address of fs.readFileSync(page, 'utf8').match(/\/images\/[^\s"')>\]]+\.(?:png|jpe?g|gif|mp4)/gi) || []) {
			if (!used.has(address)) used.set(address, new Set());
			used.get(address).add(page);
		}
	}
}

/** True when the same file is in the repository's last commit under its old path (images/...). */
function inHistory(address) {
	try {
		const committed = execFileSync('git', ['-C', site, 'rev-parse', `HEAD:${address.slice(1)}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
		const now = execFileSync('git', ['-C', site, 'hash-object', path.join(statics, address)], { encoding: 'utf8' }).trim();
		return committed === now;
	} catch {
		return false;
	}
}
/** Makes sure the original can be found again before it is replaced or deleted. */
function secure(address) {
	if (inHistory(address)) return 'in git history';
	const copy = path.join(keep, address);
	fs.mkdirSync(path.dirname(copy), { recursive: true });
	if (!fs.existsSync(copy)) fs.copyFileSync(path.join(statics, address), copy);
	return 'copied to tools/originals';
}

(async () => {
	const renamed = new Map(); // old address -> new address
	let before = 0, after = 0, count = 0;
	const report = (kind, address, from, to, note) => console.log(`${kind.padEnd(6)} ${MB(from).padStart(5)} -> ${MB(to).padStart(5)} MB  ${address}  ${note}`);

	for (const address of [...used.keys()].sort()) {
		const file = path.join(statics, address);
		if (!fs.existsSync(file)) continue;
		const size = fs.statSync(file).size;
		const ext = path.extname(address).toLowerCase();

		if (ext === '.gif' && size > 300e3 && (!only || only === 'gif')) {
			const target = address.replace(/\.gif$/i, '.webp');
			if (fs.existsSync(path.join(statics, target)) && !renamed.has(address)) { console.log('skipped, a .webp of that name exists:', address); continue; }
			const data = await sharp(file, { animated: true, limitInputPixels: false }).webp({ quality: 62, effort: 4 }).toBuffer();
			if (data.length > size * 0.8) { report('gif', address, size, data.length, 'not worth it, left alone'); continue; }
			report('gif', address, size, data.length, write ? secure(address) : '');
			if (write) { fs.writeFileSync(path.join(statics, target), data); fs.unlinkSync(file); }
			renamed.set(address, target); before += size; after += data.length; count++;
		} else if (/\.(png|jpe?g)$/.test(ext) && size > 200e3 && (!only || only === 'image')) {
			const target = address.replace(/\.\w+$/, '.webp');
			if (fs.existsSync(path.join(statics, target))) { console.log('skipped, a .webp of that name exists:', address); continue; }
			const data = await sharp(file).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
			if (data.length > size * 0.7) { report('image', address, size, data.length, 'not worth it, left alone'); continue; }
			report('image', address, size, data.length, write ? secure(address) : '');
			if (write) { fs.writeFileSync(path.join(statics, target), data); fs.unlinkSync(file); }
			renamed.set(address, target); before += size; after += data.length; count++;
		} else if (ext === '.mp4' && size > 3e6 && !/thumbnail/i.test(address) && !done.has(address) && (!only || only === 'video')) {
			const temp = file.replace(/\.mp4$/, '.slim.mp4');
			let sound = false;
			try { execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { sound = /Audio:/.test(String(e.stderr)); }
			execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', file, '-vf', "scale='min(1920,iw)':-2:flags=lanczos", '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...(sound ? ['-c:a', 'aac', '-b:a', '96k'] : ['-an']), temp]);
			const made = fs.statSync(temp).size;
			if (made > size * 0.8) { fs.unlinkSync(temp); report('video', address, size, made, 'not worth it, left alone'); continue; }
			report('video', address, size, made, write ? secure(address) : '');
			if (write) { fs.renameSync(temp, file); done.add(address); fs.writeFileSync(doneFile, JSON.stringify([...done].sort(), null, 1)); } else fs.unlinkSync(temp);
			before += size; after += made; count++;
		}
	}

	// the pages now name the new files
	let edited = 0;
	if (write && renamed.size) {
		for (const page of pages) {
			const text = fs.readFileSync(page, 'utf8');
			let next = text;
			for (const [from, to] of renamed) next = next.split(from).join(to);
			if (next !== text) { fs.writeFileSync(page, next); edited++; }
		}
	}
	console.log(`\n${count} files, ${MB(before)} MB -> ${MB(after)} MB${write ? `; ${edited} pages updated` : ' (nothing written: add --write)'}`);
})();
