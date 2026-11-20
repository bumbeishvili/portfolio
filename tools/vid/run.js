// node vid/run.js [slug ...]   records every scenario, or only the named ones.
const { record, closeBrowser } = require('./recorder.js');
const scenarios = require(process.env.SCENARIOS || './scenarios.js');
const fs = require('fs');
(async () => {
	const wanted = process.argv.slice(2);
	const jobs = Object.keys(scenarios).filter((slug) => !wanted.length || wanted.includes(slug));
	const results = fs.existsSync('vid/results.json') ? JSON.parse(fs.readFileSync('vid/results.json', 'utf8')) : {};
	const worker = async () => {
		while (jobs.length) {
			const slug = jobs.shift();
			let r;
			try { r = await record(slug, scenarios[slug], process.env.OUT || 'vid/out'); } catch (e) { r = { slug, ok: false, log: [String(e).split('\n')[0].slice(0, 200)] }; }
			results[slug] = r;
			const { log, ...rest } = r;
			console.log(JSON.stringify(rest) + (log.length ? '\n' + log.join('\n') : ''));
			fs.writeFileSync('vid/results.json', JSON.stringify(results, null, 1));
		}
	};
	await Promise.all(Array.from({ length: Number(process.env.JOBS || 2) }, worker));
	await closeBrowser();
	process.exit(0);
})();
