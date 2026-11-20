// Lighthouse, run in Playwright's Chromium, for a few pages of the site.
//      node gh/lighthouse.js [address] [desktop]        (address defaults to https://davidb.dev)
// Prints the four scores per page and the checks that did not pass, and saves the full reports
// to early-checks/lighthouse/.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = (process.argv[2] || 'https://davidb.dev').replace(/\/$/, '');
const desktop = process.argv.includes('desktop');
const pages = (process.env.PAGES || '/,/all/,/project/yff-data-dashboard,/notable-collaborations/sff,/about,/all/d3-js/,/blog/').split(',');
const out = path.resolve(__dirname, '../early-checks/lighthouse');
const PORT = 9333;

(async () => {
	const { default: lighthouse, desktopConfig } = await import('lighthouse');
	fs.mkdirSync(out, { recursive: true });
	const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });
	const failed = {}; // check id -> { title, pages: [], detail }
	console.log(`${desktop ? 'desktop' : 'phone'} run on ${base}`);
	console.log('page'.padEnd(34), 'perf  a11y  best  seo  |  LCP     CLS    TBT    weight');
	for (const page of pages) {
		const result = await lighthouse(base + page, { port: PORT, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] }, desktop ? desktopConfig : undefined);
		const lhr = result.lhr;
		fs.writeFileSync(path.join(out, (desktop ? 'desktop' : 'phone') + page.replace(/\//g, '_') + '.json'), JSON.stringify(lhr));
		const score = (id) => String(Math.round((lhr.categories[id].score ?? 0) * 100)).padStart(4);
		const a = lhr.audits;
		console.log(page.padEnd(34), score('performance'), score('accessibility'), ' ' + score('best-practices'), score('seo'), ' | ', (a['largest-contentful-paint']?.displayValue || '').padEnd(7), (a['cumulative-layout-shift']?.displayValue || '').padEnd(6), (a['total-blocking-time']?.displayValue || '').padEnd(6), a['total-byte-weight']?.displayValue || '');
		for (const category of Object.values(lhr.categories)) for (const ref of category.auditRefs) {
			const audit = a[ref.id];
			if (!audit || audit.score === null || audit.score >= 0.9 || audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'manual') continue;
			if (ref.group === 'metrics' || ref.group === 'hidden') continue;
			const items = Array.isArray(audit.details?.items) ? audit.details.items : [];
			const sample = items.slice(0, 3).map((i) => (i.node?.snippet || i.node?.selector || i.url || i.source?.url || i.description || i.label || '')).filter(Boolean).map((s) => String(s).replace(base, '').slice(0, 110));
			(failed[ref.id] ||= { title: audit.title, category: category.title, pages: [], samples: new Set(), value: audit.displayValue || '' }).pages.push(page);
			for (const s of sample) failed[ref.id].samples.add(s);
		}
	}
	await browser.close();
	console.log('\nchecks that did not pass:');
	for (const [id, f] of Object.entries(failed).sort((x, y) => x[1].category.localeCompare(y[1].category) || y[1].pages.length - x[1].pages.length)) {
		console.log(`- [${f.category}] ${f.title} (${id}) ${f.value ? '· ' + f.value : ''} · ${f.pages.length === pages.length ? 'every page' : f.pages.join(' ')}`);
		for (const s of [...f.samples].slice(0, 4)) console.log('      ' + s);
	}
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1); });
