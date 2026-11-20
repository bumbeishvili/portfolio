// The site is static files (../build), served by Cloudflare without any code. This Worker only
// steps in for video files (see "run_worker_first" in ../wrangler.jsonc).
//
// Why: Cloudflare's static file serving answers a request for a part of a file with the whole
// file. Safari, on Macs and iPhones, asks for the first two bytes of a video before playing it and
// gives up when it gets something else. So here a request for a part is answered with exactly
// that part ("206 Partial Content"), which is what the previous host did.

export default {
	async fetch(request, env) {
		const wanted = request.headers.get('Range');

		// the file itself, asked for whole
		const plain = new Request(request, { headers: withoutRange(request.headers) });
		const file = await env.ASSETS.fetch(plain);

		// not found, a HEAD request, or no part asked for: pass it on, saying that parts are possible
		if (file.status !== 200 || !file.body || !wanted) return saying(file, { 'Accept-Ranges': 'bytes' });

		// The static file comes without its size, so it is read in full to know it. The clips are
		// small (the largest is under 20 MB), and this happens only for requests that ask for a part.
		const data = await file.arrayBuffer();
		const size = data.byteLength;
		const headers = new Headers(file.headers);
		headers.set('Accept-Ranges', 'bytes');

		const part = parseRange(wanted, size);
		// a form of request this does not handle (several parts at once): the whole file is a valid answer
		if (!part) return new Response(data, { status: 200, headers });

		if (part.start >= size) {
			return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
		}

		headers.set('Content-Range', `bytes ${part.start}-${part.end}/${size}`);
		return new Response(data.slice(part.start, part.end + 1), { status: 206, headers });
	}
};

function withoutRange(headers) {
	const copy = new Headers(headers);
	copy.delete('Range');
	return copy;
}

/** The same response with a few headers added. */
function saying(response, extra) {
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(extra)) headers.set(name, value);
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * "bytes=0-1", "bytes=500-" or "bytes=-200" as the first and last byte wanted.
 * Null when the header asks for something else.
 */
function parseRange(header, size) {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match || (!match[1] && !match[2])) return null;
	if (!match[1]) {
		// the last N bytes
		const count = Math.min(Number(match[2]), size);
		return count ? { start: size - count, end: size - 1 } : null;
	}
	const start = Number(match[1]);
	const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
	return end < start && start < size ? null : { start, end };
}
