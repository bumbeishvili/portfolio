// Flags the patterns the site's owner rejected as AI-sounding. Used on every text before it goes in.
module.exports = function lint(text) {
	const found = [];
	const t = String(text).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links read as their words
	if (/:\s/.test(t.replace(/https?:/g, ''))) found.push('colon');
	if (/[;—–]/.test(t)) found.push('semicolon or dash');
	// a list of three or more: "a, b and c" / "a, b, c"
	// three or more short items in a row ("hands, body and face"); the technologies after "built with" may be a list
	const prose = t.replace(/,? ?[Bb]uilt with .*?\.(?=\s|$)/g, '.');
	const item = '(?:[\\w.+#°@-]+\\s?){1,3}';
	if (new RegExp(`(?:^|\\s)${item},\\s${item},?\\s(?:and|or)\\s`).test(prose) || new RegExp(`(?:^|\\s)${item},\\s${item},\\s${item}`).test(prose)) found.push('list of three');
	if (/\b(the clip|the screenshots?|the video above|shown above)\b/i.test(t)) found.push('talks about the clip');
	if (/\b(seamless|robust|powerful|stunning|intuitive|comprehensive|showcas|leverag|elevate|unlock|empower|sleek|innovative|immersive|effortless|vibrant|bring[s]? .* to life|walks? (you )?through|lets you|dive|journey)\b/i.test(t.replace(/Three\.js Journey/g, ''))) found.push('stock phrase');
	// a sentence of three words or fewer, put there for effect
	for (const s of t.split(/(?<=[.!?])\s+/)) if (s.trim().split(/\s+/).length <= 3 && !/^(Two components|Built with \S+)\.$/.test(s.trim())) found.push('very short sentence: ' + s.trim());
	return found;
};
