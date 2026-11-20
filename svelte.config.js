import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Every page is prerendered to static HTML (see src/routes/+layout.js).
		// 404.html is what GitHub Pages serves for unknown URLs.
		adapter: adapter({ fallback: '404.html' }),

		// The site lives at the domain root, so absolute asset paths are the safest.
		paths: { relative: false },

		prerender: {
			// A dead link or missing image inside a post is reported in the build log
			// instead of failing the whole build.
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	}
};

export default config;
