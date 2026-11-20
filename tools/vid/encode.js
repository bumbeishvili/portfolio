// Encodes every recording again from its saved frames.   node vid/encode.js [slug ...]
const fs = require('fs');
const path = require('path');
const { encodeClip } = require('./recorder.js');
const scenarios = require(process.env.SCENARIOS || './scenarios.js');
(async () => {
	const wanted = process.argv.slice(2);
	const slugs = fs.readdirSync('vid/out').filter((s) => fs.existsSync(`vid/out/${s}/frames.txt`) && (!wanted.length || wanted.includes(s)));
	let page = 0, card = 0;
	for (const slug of slugs) {
		const r = await encodeClip(path.resolve('vid/out', slug), scenarios[slug] || {});
		page += r.pageKB; card += r.cardKB;
		console.log(slug.padEnd(46) + JSON.stringify(r));
	}
	console.log(`${slugs.length} clips: page clips ${(page / 1024).toFixed(2)} MB, card clips ${(card / 1024).toFixed(2)} MB`);
})();
