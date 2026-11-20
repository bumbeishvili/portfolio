// Masonry and imagesLoaded touch `window` when they load, so they are only ever imported in the browser.
let libs;

// Both are old CommonJS packages. Depending on how the bundler wraps them, the function we want
// is the module's default export or one level further in.
const unwrap = (module) => (typeof module.default === 'function' ? module.default : (module.default?.default ?? module));

/**
 * Loads the two libraries once. Called when the site starts, so they are ready before any grid.
 *
 * Both are "UMD" packages: if they find an AMD loader on the page (a global `define`), they hand
 * themselves to it instead of returning their code. The Observable notebooks embedded in the tool
 * posts install such a loader, so it is hidden for the moment these two packages are evaluated.
 */
export function loadMasonry() {
	libs ??= (async () => {
		const amd = window.define;
		const hide = typeof amd === 'function' && amd.amd;
		if (hide) window.define = undefined;
		try {
			const [masonry, imagesLoaded] = await Promise.all([import('masonry-layout'), import('imagesloaded')]);
			const loaded = { Masonry: unwrap(masonry), imagesLoaded: unwrap(imagesLoaded) };
			if (typeof loaded.Masonry !== 'function' || typeof loaded.imagesLoaded !== 'function') {
				throw new Error('The masonry libraries did not load as expected');
			}
			return loaded;
		} finally {
			if (hide) window.define = amd;
		}
	})();
	return libs;
}

/**
 * Svelte action: arranges the matching children in a masonry grid once their images have loaded.
 *
 * `watchItems` re-runs the layout whenever a card changes size (videos only know their height once
 * their metadata arrives). `items` is not read here: passing the list makes Svelte call `update`
 * when cards are added or removed, so the grid picks them up.
 *
 * @param {HTMLElement} node
 * @param {{ itemSelector: string, watchItems?: boolean, items?: unknown }} options
 */
export function masonry(node, { itemSelector, watchItems = false }) {
	let instance;
	let observer;
	let frame = 0;
	let destroyed = false;

	function layout(Masonry) {
		if (destroyed) return;
		if (instance) instance.layout();
		else instance = new Masonry(node, { itemSelector, transitionDuration: 0 });
	}

	function observe() {
		if (!observer) return;
		observer.disconnect();
		node.querySelectorAll(itemSelector).forEach((item) => observer.observe(item));
	}

	loadMasonry().then(({ Masonry, imagesLoaded }) => {
		if (destroyed) return;

		// Cards with a width and height on their picture have their final size already, so the grid is
		// laid out right away. Pictures without one are waited for (the lazy ones below never hold this up:
		// if they change a card's size later, the observer below lays the grid out again).
		layout(Masonry);
		imagesLoaded(node, () => layout(Masonry));

		if (watchItems && typeof ResizeObserver !== 'undefined') {
			observer = new ResizeObserver(() => {
				if (frame) return;
				frame = requestAnimationFrame(() => {
					frame = 0;
					layout(Masonry);
				});
			});
			observe();
		}
	}, () => {
		// no grid library: the cards stay in their plain two-column float layout
	});

	return {
		update() {
			if (!instance) return;
			instance.reloadItems();
			instance.layout();
			observe();
		},
		destroy() {
			destroyed = true;
			cancelAnimationFrame(frame);
			observer?.disconnect();
			instance?.destroy();
		}
	};
}
