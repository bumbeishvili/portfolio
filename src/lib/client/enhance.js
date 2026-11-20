import { loadMasonry } from './masonry.js';
import { lightbox } from './lightbox.js';

// Progressive enhancement for the HTML that comes out of the markdown files. Runs after every
// navigation, on whatever content is on the page (the same job the theme's jQuery `pageFunctions` did).
//
//  - <div class="gallery" data-columns="3"> full of <img> becomes a masonry grid with click-to-zoom
//  - an image alone in a paragraph is pulled out into a centred .image-wrap
//  - YouTube / Vimeo iframes are wrapped so they keep their aspect ratio
//
// Returns a function that undoes the listeners (the DOM itself is thrown away with the page).

/** @param {HTMLElement} root */
export function enhanceContent(root) {
	const cleanups = [];
	let destroyed = false;

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Galleries

	root.querySelectorAll('.gallery').forEach((gallery, index) => {
		gallery.id = `gallery-${index + 1}`;

		const wrap = document.createElement('div');
		wrap.className = 'gallery__wrap';
		gallery.append(wrap);

		for (const img of [...gallery.children].filter((child) => child.tagName === 'IMG')) {
			const item = document.createElement('div');
			item.className = 'gallery__item';
			const link = document.createElement('a');
			link.className = 'gallery__item__link';
			link.href = img.getAttribute('src');
			link.append(img);
			item.append(link);
			wrap.append(item);
		}

		loadMasonry().then(({ Masonry, imagesLoaded }) => {
			if (destroyed) return;
			imagesLoaded(gallery, () => {
				if (destroyed) return;
				gallery.classList.add('gallery--grid');

				const grid = new Masonry(wrap, { itemSelector: '.gallery__item', transitionDuration: 0 });
				cleanups.push(() => grid.destroy());

				wrap.querySelectorAll('.gallery__item__link').forEach((link) => cleanups.push(lightbox(link)));

				// Galleries stay hidden until they are laid out.
				gallery.classList.add('gallery--on');
			});
		}, () => {
			// no grid library: show the images in plain rows rather than not at all
			gallery.classList.add('gallery--grid', 'gallery--on');
		});
	});

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Images

	root.querySelectorAll('.single p > img').forEach((img) => {
		const paragraph = img.parentElement;
		if (!paragraph.parentNode) return;
		const wrap = document.createElement('div');
		wrap.className = 'image-wrap';
		paragraph.after(wrap);
		wrap.append(img);
		paragraph.remove();
	});

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Videos

	root.querySelectorAll('.single iframe').forEach((iframe) => {
		const src = iframe.getAttribute('src') ?? '';
		if (!src.includes('youtube') && !src.includes('vimeo')) return;

		const ratio = (iframe.getAttribute('height') / iframe.getAttribute('width')) * 100;
		const wrap = document.createElement('div');
		wrap.className = 'video-wrap';
		const video = document.createElement('div');
		video.className = 'video';
		video.style.paddingBottom = `${ratio}%`;
		wrap.append(video);
		iframe.before(wrap);
		video.append(iframe);
	});

	return () => {
		destroyed = true;
		cleanups.forEach((cleanup) => cleanup());
	};
}

/**
 * The interactive tool posts keep their code in a hidden `.script-this` element and start it with an
 * inline <script>. Inline scripts only run on a full page load, so after a client-side navigation the
 * code has to be started by hand.
 */
export function runEmbeddedModule(root) {
	const source = root.querySelector('.script-this');
	if (!source) return;
	const script = document.createElement('script');
	script.type = 'module';
	script.textContent = source.innerText;
	document.body.appendChild(script);
}
