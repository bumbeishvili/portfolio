// Reads the commit history of every project's code (read-only) and saves, per project, the dates of
// its commits. Local folders are read with git, GitHub repositories with `gh api`.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const sources = require('./sources.js');
const root = require('path').resolve(__dirname, '../../..'); // the folder that holds this repository and the other projects
const out = path.join(__dirname, 'commits.json');
const saved = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, maxBuffer: 64e6 }); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 200); } };

function local(name, sub) {
	const dir = path.join(root, name);
	// only the user's own commits count (several of these are team repositories)
	const args = ['-C', dir, 'log', '--all', '--no-merges', '--format=%as|%s', '--author=^bumbeishvili <', '--author=^David *Bumbeishvili', '--author=^Dato'];
	if (sub) args.push('--', sub);
	return run('git', args).trim().split('\n').filter(Boolean);
}
function github(repo) {
	const text = run('gh', ['api', `repos/${repo}/commits?per_page=100`, '--paginate', '-q', '.[] | (.commit.author.date[0:10] + "|" + (.commit.message | split("\n")[0]))']);
	return text.trim().split('\n').filter(Boolean);
}

for (const [slug, list] of Object.entries(sources)) {
	for (const s of list) {
		const key = s.local ? 'local:' + s.local + (s.sub ? '/' + s.sub : '') : 'gh:' + s.gh;
		if (saved[key] && !process.env.FORCE) continue;
		const lines = s.local ? local(s.local, s.sub) : github(s.gh);
		saved[key] = lines;
		console.log(slug.padEnd(48), key.padEnd(60), lines.length, lines[0]?.startsWith('ERR') ? lines[0] : '');
		fs.writeFileSync(out, JSON.stringify(saved));
	}
}
