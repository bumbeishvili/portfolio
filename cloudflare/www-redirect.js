// www.davidb.dev: every address is sent on to the same address on davidb.dev.
export default {
	fetch(request) {
		const url = new URL(request.url);
		url.protocol = 'https:';
		url.hostname = 'davidb.dev';
		url.port = '';
		return Response.redirect(url.toString(), 301);
	}
};
