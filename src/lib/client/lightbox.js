// Click-to-zoom for gallery images.
//
// This is a dependency-free port of Fluidbox 2 (the jQuery plugin the Jekyll theme used). It builds the
// same DOM and toggles the same `fluidbox--*` classes, so the existing styles in styles/_plugins.scss
// drive the animation exactly as before.

const STACK_INDEX = 1000;
const STACK_INDEX_DELTA = 10;
const VIEWPORT_FILL = 0.95;
const RESIZE_THROTTLE = 500;

const viewport = { w: 0, h: 0 };
const instances = new Set();
let count = 0;

function measureViewport() {
	viewport.w = document.documentElement.clientWidth;
	viewport.h = document.documentElement.clientHeight;
}

/** Position relative to the document. */
function offset(el) {
	const rect = el.getBoundingClientRect();
	return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
}

/** Run `fn` at most once every `delay` ms, including one trailing call. */
function throttle(delay, fn) {
	let last = 0;
	let timer;
	return () => {
		const elapsed = Date.now() - last;
		const run = () => {
			last = Date.now();
			fn();
		};
		clearTimeout(timer);
		if (elapsed > delay) run();
		else timer = setTimeout(run, delay - elapsed);
	};
}

const truncate = (n) => parseInt(100 * n) / 100;
const escapeUrl = (url) =>
	url.replace(/"/g, '%22').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
// Fluidbox refuses to open URLs that contain whitespace or a plus sign.
const unsafeUrl = (url) => /[\s+]/.test(url);

/**
 * Turns `<a href="large.jpg"><img src="thumb.jpg"></a>` into a zoomable image.
 * Returns a function that removes the listeners again.
 *
 * @param {HTMLAnchorElement} link
 */
export function lightbox(link) {
	const img = link.querySelector('img');
	if (link.children.length !== 1 || link.firstElementChild !== img) return () => {};
	if (getComputedStyle(link).display === 'none' || getComputedStyle(img).display === 'none') {
		return () => {};
	}

	measureViewport();

	// --- DOM: <a><div.fluidbox__wrap><img.fluidbox__thumb><div.fluidbox__ghost><div.fluidbox__loader>
	const id = ++count;
	link.classList.add(`fluidbox__instance-${id}`, 'fluidbox--initialized', 'fluidbox--closed');

	const wrap = document.createElement('div');
	wrap.className = 'fluidbox__wrap';
	wrap.style.zIndex = STACK_INDEX - STACK_INDEX_DELTA;
	wrap.append(...link.childNodes);
	link.append(wrap);

	img.style.opacity = 1;
	img.classList.add('fluidbox__thumb');

	const ghost = document.createElement('div');
	ghost.className = 'fluidbox__ghost';
	img.after(ghost);

	const loader = document.createElement('div');
	loader.className = 'fluidbox__loader';
	loader.style.zIndex = 2;
	wrap.append(loader);

	const thumb = { natW: 0, natH: 0, w: 0, h: 0 };
	let state = null; // null: never opened, 1: open, 0: closed
	let overlay = null;
	let onCloseEnd = null;
	let destroyed = false;

	/** Where the thumbnail's content box sits inside the wrap. */
	function thumbPosition() {
		const style = getComputedStyle(img);
		const imgOffset = offset(img);
		const wrapOffset = offset(wrap);
		return {
			top: imgOffset.top - wrapOffset.top + parseInt(style.borderTopWidth) + parseInt(style.paddingTop),
			left: imgOffset.left - wrapOffset.left + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft)
		};
	}

	function measure() {
		const style = getComputedStyle(img);
		thumb.natW = img.naturalWidth;
		thumb.natH = img.naturalHeight;
		thumb.w = parseFloat(style.width) || 0;
		thumb.h = parseFloat(style.height) || 0;

		const { top, left } = thumbPosition();
		ghost.style.width = `${thumb.w}px`;
		ghost.style.height = `${thumb.h}px`;
		ghost.style.top = `${top}px`;
		ghost.style.left = `${left}px`;
	}

	/** Scale and move the ghost so the image fills the viewport. */
	function compute() {
		const { natW, natH, w, h } = thumb;
		const imageRatio = natW / natH;
		const viewportRatio = viewport.w / viewport.h;

		let scaleX, scaleY, scale;
		if (viewportRatio > imageRatio) {
			const height = natH < viewport.h ? natH : viewport.h * VIEWPORT_FILL;
			scaleY = height / h;
			scaleX = (natW * ((h * scaleY) / natH)) / w;
			scale = scaleY;
		} else {
			const width = natW < viewport.w ? natW : viewport.w * VIEWPORT_FILL;
			scaleX = width / w;
			scaleY = (natH * ((w * scaleX) / natW)) / h;
			scale = scaleX;
		}

		const imgOffset = offset(img);
		const wrapOffset = offset(wrap);
		const y = window.scrollY - imgOffset.top + 0.5 * (h * (scale - 1)) + 0.5 * (viewport.h - h * scale);
		const x = 0.5 * (w * (scale - 1)) + 0.5 * (viewport.w - w * scale) - imgOffset.left;
		const transform = `translate(${truncate(x)}px,${truncate(y)}px) scale(${truncate(scaleX)},${truncate(scaleY)})`;

		ghost.style.transform = transform;
		ghost.style.top = `${imgOffset.top - wrapOffset.top}px`;
		ghost.style.left = `${imgOffset.left - wrapOffset.left}px`;
		loader.style.transform = transform;
	}

	function open() {
		state = 1;
		if (onCloseEnd) {
			ghost.removeEventListener('transitionend', onCloseEnd);
			onCloseEnd = null;
		}
		for (const other of instances) if (other !== api && other.isOpened()) other.close();

		overlay = document.createElement('div');
		overlay.className = 'fluidbox__overlay';
		overlay.style.zIndex = -1;
		wrap.append(overlay);

		link.classList.remove('fluidbox--closed');
		link.classList.add('fluidbox--loading');

		const src = img.getAttribute('src');
		if (unsafeUrl(src)) return close();

		ghost.style.backgroundImage = `url(${escapeUrl(src)})`;
		ghost.style.opacity = 1;
		measure();

		// Load the full-size image, then zoom.
		const full = new Image();
		full.onload = () => {
			if (destroyed) return;
			link.classList.remove('fluidbox--loading');
			link.classList.add('fluidbox--opened', 'fluidbox--loaded');
			wrap.style.zIndex = STACK_INDEX + STACK_INDEX_DELTA;
			if (unsafeUrl(full.src)) return close({ error: true });

			ghost.style.backgroundImage = `url(${escapeUrl(full.src)})`;
			thumb.natW = full.naturalWidth;
			thumb.natH = full.naturalHeight;
			compute();
			img.style.opacity = 0;
			document.querySelectorAll('.fluidbox__overlay').forEach((el) => (el.style.opacity = 1));
		};
		full.onerror = () => close({ error: true });
		full.src = link.getAttribute('href');
	}

	function close({ error = false } = {}) {
		if (!state) return;
		state = 0;

		link.classList.remove('fluidbox--opened', 'fluidbox--loaded', 'fluidbox--loading');
		link.classList.add('fluidbox--closed');

		const { top, left } = thumbPosition();
		ghost.style.transform = 'translate(0,0) scale(1,1)';
		ghost.style.top = `${top}px`;
		ghost.style.left = `${left}px`;
		loader.style.transform = 'none';

		const closing = overlay;
		onCloseEnd = () => {
			onCloseEnd = null;
			ghost.style.opacity = 0;
			img.style.opacity = 1;
			closing?.remove();
			wrap.style.zIndex = STACK_INDEX - STACK_INDEX_DELTA;
		};
		ghost.addEventListener('transitionend', onCloseEnd, { once: true });
		if (error) ghost.dispatchEvent(new Event('transitionend'));
		if (closing) closing.style.opacity = 0;
	}

	function onClick(event) {
		event.preventDefault();
		if (state) close();
		else open();
	}

	const onResize = throttle(RESIZE_THROTTLE, () => {
		measureViewport();
		measure();
		if (link.classList.contains('fluidbox--opened')) compute();
	});

	function ready() {
		if (destroyed) return;
		measure();
		link.addEventListener('click', onClick);
		link.classList.add('fluidbox--ready');
		window.addEventListener('resize', onResize);
	}

	const api = { close, isOpened: () => link.classList.contains('fluidbox--opened') };
	instances.add(api);

	const size = getComputedStyle(img);
	if (parseFloat(size.width) > 0 && parseFloat(size.height) > 0) {
		ready();
	} else {
		const probe = new Image();
		probe.onload = ready;
		probe.src = img.getAttribute('src');
	}

	return () => {
		destroyed = true;
		instances.delete(api);
		link.removeEventListener('click', onClick);
		window.removeEventListener('resize', onResize);
	};
}
