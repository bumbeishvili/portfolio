// Checks the tag editor in a browser: loads, adds a tag from the dropdown, adds a new one, removes one,
// reads the saved file, then drops the edits again.   node tools/tag-editor/test.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const saved = path.join(__dirname, 'tags-edited.json');
(async () => {
	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
	const errors = [];
	p.on('pageerror', (e) => errors.push(String(e)));
	p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
	p.on('dialog', (d) => d.accept());
	await p.goto('http://localhost:3003/');
	await p.waitForSelector('.row');
	console.log('rows', await p.locator('.row').count(), '|', await p.locator('#count').innerText());
	const broken = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); return [...document.querySelectorAll('.thumb img')].filter((i) => i.complete && !i.naturalWidth).length; });
	console.log('broken images among loaded', broken);
	await p.screenshot({ path: path.join(__dirname, 'test-1.png') });
	const row = p.locator('.row[data-slug="globe-with-cells-and-points"]');
	await row.scrollIntoViewIfNeeded();
	await row.locator('select').selectOption('animation');           // from the dropdown
	await row.locator('.add input').fill('Test  New Tag');
	await row.locator('.add input').press('Enter');                    // a new tag
	await row.locator('.chip', { hasText: 'globe' }).locator('button').click(); // remove one
	await p.waitForTimeout(900);
	console.log('chips', await row.locator('.chip').allInnerTexts());
	console.log('status', await p.locator('#status').innerText(), '|', await p.locator('#count').innerText());
	const file = JSON.parse(fs.readFileSync(saved, 'utf8'));
	console.log('file', JSON.stringify(file.tags['globe-with-cells-and-points']), Object.keys(file.tags).length, 'projects');
	await row.screenshot({ path: path.join(__dirname, 'test-2.png') });
	// quick tag and filter
	await p.locator('#quick').selectOption('network');
	console.log('quick buttons', await p.locator('.quick').count(), 'on:', await p.locator('.quick.has').count());
	await p.locator('#cloud .chip', { hasText: /^mediapipe/ }).click();
	console.log('filtered rows', await p.locator('.row').count(), await p.locator('#filterNote').innerText());
	await p.locator('#cloud .chip', { hasText: /^mediapipe/ }).click();
	await p.reload(); await p.waitForSelector('.row');
	console.log('after reload', await p.locator('#count').innerText(), '|', await p.locator('#status').innerText());
	await p.locator('#discard').click();
	await p.waitForTimeout(500);
	console.log('after discard', await p.locator('#count').innerText(), '| file exists', fs.existsSync(saved));
	console.log('errors', errors.length, errors.slice(0, 3));
	await b.close();
})();
