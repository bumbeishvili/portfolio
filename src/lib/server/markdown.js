import MarkdownIt from 'markdown-it';

// The content was written for kramdown (Jekyll's markdown engine, in GFM mode). To keep every page
// rendering the way it always has, this configures markdown-it to follow kramdown where the two differ:
//
//  - block-level HTML such as <div>, <video>, <iframe> or <style> is one raw block up to its closing
//    tag, blank lines included, and markdown inside it is NOT processed (see `rawHtml` below)
//  - inline HTML such as <img>, <br> or <span> on its own line is still a paragraph
//  - quotes, dashes and ellipses are converted to their typographic forms
//  - headings get GitHub-style ids
//  - code gets the classes kramdown gave it, which the stylesheet targets

// Tags kramdown treats as inline. Anything else that opens a line starts a raw HTML block.
const SPAN_TAGS = new Set(
	'a abbr acronym b big bdo br button cite code del dfn em i img input ins kbd label mark option q rb rbc rp rt rtc ruby samp select small span strong sub sup tt u var'.split(
		' '
	)
);
const VOID_TAGS = new Set(
	'area base br col command embed hr img input keygen link meta param source track wbr'.split(' ')
);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Raw HTML blocks

// kramdown's idea of a tag: an XML-style name, and attributes that are either bare or quoted.
const NAME = '(?:[\\w:][\\-\\w.]*:)?[\\w:][\\-\\w.]*';
const OPEN_TAG = new RegExp(`<(${NAME})\\s*((?:\\s+${NAME}(?:\\s*=\\s*(["'])[\\s\\S]*?\\3)?)*)\\s*(\\/)?>`, 'y');
const CLOSE_TAG = new RegExp(`<\\/(${NAME})\\s*>`, 'y');
const COMMENT = /<!--[\s\S]*?-->/y;
const INSTRUCTION = /<\?[\s\S]*?\?>/y;
const MARKUP_START = new RegExp(`<(?:${NAME}|\\/|!--|\\?)`, 'g');

/** Escapes text the way kramdown does: `<`, `>` and `&`, leaving existing entities such as `&amp;` alone. */
const escapeText = (text) =>
	text.replace(/&(?:[\w:][\-\w.]*|#\d+|#x[0-9a-fA-F]+);|[<>&]/g, (match) =>
		match === '<' ? '&lt;' : match === '>' ? '&gt;' : match === '&' ? '&amp;' : match
	);

const matchAt = (regex, text, pos) => {
	regex.lastIndex = pos;
	return regex.exec(text);
};

/**
 * Reads one HTML element starting at `pos` (which must be an opening tag) and returns its markup and
 * where it ends. This is what makes hand-written HTML in the posts safe to drop into the page:
 *
 *  - an element that is never closed is closed at the end of the document
 *  - a closing tag that does not match the element it is in is shown as text
 *  - a `<` that is not a real tag (as in `a < b`, or code kept inside a hidden <div>) is escaped
 *  - the contents of <script> and <style> are left exactly as written
 *
 * @returns {{ html: string, end: number } | null}
 */
function rawHtml(text, pos) {
	const open = []; // names of the elements we are inside, outermost first
	let html = '';

	/** Consumes an opening tag at `pos`; returns false if there is none. */
	const openTag = () => {
		const tag = matchAt(OPEN_TAG, text, pos);
		if (!tag) return false;
		const name = tag[1].toLowerCase();
		html += tag[0];
		pos = OPEN_TAG.lastIndex;

		if (tag[4] || VOID_TAGS.has(name)) return true;

		if (name === 'script' || name === 'style') {
			const close = new RegExp(`</${name}\\s*>`, 'i').exec(text.slice(pos));
			const end = close ? pos + close.index : text.length;
			html += text.slice(pos, end) + `</${name}>`;
			pos = close ? end + close[0].length : end;
			return true;
		}

		open.push(name);
		return true;
	};

	if (!openTag()) return null;

	while (open.length) {
		MARKUP_START.lastIndex = pos;
		const next = MARKUP_START.exec(text);
		if (!next) {
			// ran out of document: close whatever is still open
			html += escapeText(text.slice(pos));
			pos = text.length;
			while (open.length) html += `</${open.pop()}>`;
			break;
		}

		html += escapeText(text.slice(pos, next.index));
		pos = next.index;

		const special = matchAt(COMMENT, text, pos) ?? matchAt(INSTRUCTION, text, pos);
		if (special) {
			html += special[0];
			pos += special[0].length;
		} else if (openTag()) {
			// handled
		} else {
			const close = matchAt(CLOSE_TAG, text, pos);
			if (close && close[1].toLowerCase() === open[open.length - 1]) {
				html += `</${open.pop()}>`;
				pos = CLOSE_TAG.lastIndex;
			} else if (close) {
				html += escapeText(close[0]);
				pos = CLOSE_TAG.lastIndex;
			} else {
				html += escapeText(text[pos]);
				pos++;
			}
		}
	}

	return { html, end: pos };
}

/** Block rule: raw HTML blocks with kramdown semantics (replaces markdown-it's CommonMark `html_block`). */
function kramdownHtmlBlock(state, startLine, endLine, silent) {
	const pos = state.bMarks[startLine] + state.tShift[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	if (state.src.charCodeAt(pos) !== 0x3c /* < */) return false;

	let block;
	const comment = matchAt(COMMENT, state.src, pos);
	if (comment) {
		block = { html: comment[0], end: pos + comment[0].length };
	} else {
		const tag = matchAt(OPEN_TAG, state.src, pos);
		if (!tag || SPAN_TAGS.has(tag[1].toLowerCase())) return false;
		block = rawHtml(state.src, pos);
	}

	if (silent) return true;

	// The block owns every line up to and including the one its last character is on.
	let nextLine = startLine;
	while (nextLine < endLine - 1 && state.eMarks[nextLine] < block.end - 1) nextLine++;
	nextLine++;

	const lineEnd = state.eMarks[nextLine - 1];
	const token = state.push('html_block', '', 0);
	token.map = [startLine, nextLine];
	token.content = block.html + state.src.slice(block.end, Math.max(block.end, lineEnd)) + '\n';
	state.line = nextLine;
	return true;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Inline rules

/** Core rule: kramdown's typographic symbols (markdown-it's own `replacements` rule also rewrites (c), (tm), +-). */
function typographicSymbols(state) {
	for (const block of state.tokens) {
		if (block.type !== 'inline') continue;
		let inAutolink = 0;
		for (const token of block.children) {
			if (token.type === 'link_open' && token.info === 'auto') inAutolink++;
			if (token.type === 'link_close' && token.info === 'auto') inAutolink--;
			if (token.type !== 'text' || inAutolink) continue;
			token.content = token.content
				.replace(/---/g, '—')
				.replace(/--/g, '–')
				.replace(/\.\.\./g, '…')
				.replace(/<< /g, '« ')
				.replace(/ >>/g, ' »')
				.replace(/<</g, '«')
				.replace(/>>/g, '»');
		}
	}
}

/** Core rule: GitHub-style heading ids, built from the heading's text the way kramdown's GFM parser does. */
function headingIds(state) {
	const used = new Map();
	state.tokens.forEach((token, i) => {
		if (token.type !== 'heading_open') return;

		const text = state.tokens[i + 1].children
			.filter((child) => ['text', 'text_special', 'code_inline'].includes(child.type))
			.map((child) => child.content)
			.join('');
		const id = text
			.toLowerCase()
			.replace(/[^\p{L}\p{M}\p{Nd}\p{Pc}\- \t]/gu, '')
			.replace(/[ \t]/g, '-');

		// A repeated heading gets -1, -2, ...
		const seen = used.get(id) ?? 0;
		used.set(id, seen + 1);
		token.attrSet('id', seen ? `${id}-${seen}` : id);
	});
}

const md = new MarkdownIt({
	html: true,
	typographer: true,
	quotes: '“”‘’'
});

md.block.ruler.at('html_block', kramdownHtmlBlock, { alt: ['paragraph', 'reference', 'blockquote'] });
// Runs right after inline parsing, while the text is still as written (before quotes and dashes change).
md.core.ruler.after('inline', 'heading_ids', headingIds);
md.core.ruler.at('replacements', typographicSymbols);

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Output

const escapeHtml = md.utils.escapeHtml;

md.renderer.rules.code_inline = (tokens, idx) =>
	`<code class="highlighter-rouge">${escapeHtml(tokens[idx].content)}</code>`;

// Code blocks get the wrappers the theme's styles expect. (No syntax colouring: no post uses it yet.)
const codeBlock = (code, language) =>
	`<div class="${language ? `language-${escapeHtml(language)} ` : ''}highlighter-rouge"><div class="highlight">` +
	`<pre class="highlight"><code>${escapeHtml(code)}</code></pre></div></div>\n`;

md.renderer.rules.code_block = (tokens, idx) => codeBlock(tokens[idx].content, '');
md.renderer.rules.fence = (tokens, idx) => codeBlock(tokens[idx].content, tokens[idx].info.trim().split(/\s+/)[0]);

// `<a/>` is not self-closing in HTML: browsers read it as an opening tag that swallows what follows.
// kramdown wrote such tags out as an empty element, so do the same.
md.renderer.rules.html_inline = (tokens, idx) => {
	const html = tokens[idx].content;
	const tag = /^<([a-zA-Z][\w:-]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)\s*\/>$/.exec(html);
	return tag && !VOID_TAGS.has(tag[1].toLowerCase()) ? `<${tag[1]}${tag[2]}></${tag[1]}>` : html;
};

/** Renders a markdown document body to HTML. */
export function renderMarkdown(source) {
	return md.render(source);
}
