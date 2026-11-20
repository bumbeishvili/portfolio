import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// http://localhost:3002 (and fail instead of quietly moving to another port if it is taken)
		port: 3002,
		strictPort: true,
		// The archived Jekyll site is not part of this app, and neither is the build output:
		// without this, running `npm run build` reloads the browser once per generated page.
		watch: { ignored: ['**/old/**', '**/build/**'] }
	},
	optimizeDeps: {
		// Only ever loaded with import() in the browser, so tell Vite about them up front
		// instead of letting it discover (and re-bundle) them in the middle of a session.
		include: ['masonry-layout', 'imagesloaded']
	}
});
