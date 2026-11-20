// Quick look at a page: title, height, a few selectors (argv: url [selector...])
const { chromium } = require('playwright');
(async () => {
	const [url, ...sels] = process.argv.slice(2);
	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
	await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('goto', String(e).slice(0, 80)));
	await p.waitForTimeout(Number(process.env.WAIT || 6000));
	console.log(await p.title(), '| height', await p.evaluate(() => document.documentElement.scrollHeight), '| iframes', await p.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.src).join(' ')));
	for (const s of sels) console.log(s, await p.locator(s).count());
	console.log((await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 500));
	if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
	await b.close();
})();
