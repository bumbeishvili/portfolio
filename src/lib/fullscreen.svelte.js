// Opening any page with ?full=true in the URL hides the sidebar and lets the page use the whole
// window, which is handy for sharing or embedding a single project.

export const fullscreen = $state({ on: false });

/** Call once in the browser, when the site first loads. */
export function readFullscreenFromUrl() {
	if (!new URL(window.location.href).searchParams.get('full')) return;

	fullscreen.on = true;
	// Let charts and grids re-measure once the sidebar has moved out of the way.
	setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
}
