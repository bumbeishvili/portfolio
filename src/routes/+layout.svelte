<script>
	import '$lib/styles/main.scss';

	import { afterNavigate, beforeNavigate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { site, pageTitle } from '$lib/site.js';
	import { fullscreen, readFullscreenFromUrl } from '$lib/fullscreen.svelte.js';
	import { trail } from '$lib/trail.svelte.js';
	import { enhanceContent, runEmbeddedModule } from '$lib/client/enhance.js';
	import { loadMasonry } from '$lib/client/masonry.js';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	/** @type {HTMLElement} */
	let content;
	let cleanup = () => {};

	// Every page's load function returns `meta`; the fallback is for the "not found" page.
	const meta = $derived(page.data.meta ?? { title: 'Page not found', noindex: true });
	const title = $derived(pageTitle(meta.title, page.url.pathname));
	const description = $derived(meta.description || site.description);
	const absolute = (path) => (/^https?:/.test(path) ? path : site.url + path);
	const image = $derived(absolute(meta.image || site.shareImage));
	// the one address search engines should use for this page
	const canonical = $derived(absolute(meta.canonical ?? page.url.pathname));

	// schema.org description of the page for search engines and AI crawlers (see structured-data.js).
	// "<" is escaped so nothing in the data can end the script tag early.
	const structuredData = $derived(
		page.data.structuredData
			? '<script type="application/ld+json">' +
					JSON.stringify(page.data.structuredData).replace(/</g, '\\u003c') +
					'</' + 'script>'
			: ''
	);

	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Page transitions
	//
	// <body class="loading"> fades the page out and shows the loader (see styles/_basic.scss).
	// On navigation: fade out, swap the content after 400ms, fade back in. The page being left stays
	// where it is while it fades; the new one starts at the top, or, when going back or forward,
	// at the position it was left at.

	const FADE = 400;

	/** Scroll position of each page when it was last left, by URL. */
	const positions = new Map();
	let stopRestoring = () => {};

	// Moving between the All tab and its tag filters swaps the cards in place, without the fade.
	const isProjectList = (url) => url.pathname.startsWith('/all/');
	let instant = false;

	beforeNavigate((navigation) => {
		if (navigation.willUnload || !navigation.to) return;
		// Clicking the link of the page you are on does nothing.
		if (navigation.type === 'link' && navigation.to.url.href === navigation.from?.url.href) {
			return navigation.cancel();
		}
		stopRestoring();
		if (navigation.from) positions.set(navigation.from.url.href, window.scrollY);
		instant = Boolean(navigation.from && isProjectList(navigation.from.url) && isProjectList(navigation.to.url));
		if (!instant) document.body.classList.add('loading');
	});

	onNavigate(() => (instant ? undefined : new Promise((resolve) => setTimeout(resolve, FADE))));

	afterNavigate((navigation) => {
		const initial = navigation.type === 'enter';

		cleanup();
		cleanup = enhanceContent(content);

		if (initial) {
			// fetch the grid libraries right away, whatever page the visit starts on
			loadMasonry().catch(() => {});
			readFullscreenFromUrl();
			// First visit: keep the loader up until the first image has arrived.
			whenLoaded(content.querySelector('img')).then(showPage);
		} else {
			trail.inSite = true;
			runEmbeddedModule(content);
			if (navigation.type === 'popstate') restoreScroll(positions.get(navigation.to?.url.href));
			showPage();
		}
	});

	/**
	 * Back / forward: return to where the visitor was on this page. The grids keep settling for a
	 * moment after they appear (masonry, videos reporting their size), so the position is put back
	 * every time the page changes height, until it has been still for a while or the visitor scrolls.
	 * @param {number | undefined} y
	 */
	function restoreScroll(y) {
		if (!y) return;
		const apply = () => window.scrollTo(0, y);
		const observer = new ResizeObserver(apply);
		const userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
		const stop = () => {
			observer.disconnect();
			clearTimeout(timer);
			userEvents.forEach((event) => window.removeEventListener(event, stop));
		};
		const timer = setTimeout(stop, 3000);
		userEvents.forEach((event) => window.addEventListener(event, stop, { passive: true }));
		observer.observe(content);
		apply();
		stopRestoring = stop;
	}

	function showPage() {
		document.body.classList.remove('loading', 'menu--open');
	}

	/** @param {HTMLImageElement | null} img */
	function whenLoaded(img) {
		if (!img || img.complete) return Promise.resolve();
		return new Promise((resolve) => {
			img.addEventListener('load', resolve, { once: true });
			img.addEventListener('error', resolve, { once: true });
		});
	}


	// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Links
	//
	// External links always open in a new tab. Runs in the capture phase so it sees the click
	// before SvelteKit's router does.

	/** @param {MouseEvent} event */
	function onLinkClick(event) {
		const link = /** @type {Element} */ (event.target).closest?.('a');
		const href = link?.getAttribute('href');
		if (!href) return;

		if (href.includes('http')) {
			event.preventDefault();
			window.open(href, '_blank');
		} else if (link.classList.contains('js-no-ajax')) {
			event.preventDefault();
			window.location.href = href;
		} else if (link.classList.contains('gallery__item__link')) {
			// handled by the lightbox, never a navigation
			event.preventDefault();
		}
	}

	$effect(() => {
		document.addEventListener('click', onLinkClick, true);
		return () => document.removeEventListener('click', onLinkClick, true);
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonical} />
	{#if meta.noindex}
		<meta name="robots" content="noindex" />
	{/if}

	<!-- link previews -->
	<meta property="og:type" content={meta.type ?? 'website'} />
	<meta property="og:site_name" content={site.title} />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:image" content={image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />

	{@html structuredData}
</svelte:head>

<Header />

<div class="loader">
	<svg width="120" height="30" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg">
		<circle cx="15" cy="15" r="15">
			<animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" />
			<animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" />
		</circle>
		<circle cx="60" cy="15" r="9" fill-opacity="0.3">
			<animate attributeName="r" from="9" to="9" begin="0s" dur="0.8s" values="9;15;9" calcMode="linear" repeatCount="indefinite" />
			<animate attributeName="fill-opacity" from="0.5" to="0.5" begin="0s" dur="0.8s" values=".5;1;.5" calcMode="linear" repeatCount="indefinite" />
		</circle>
		<circle cx="105" cy="15" r="15">
			<animate attributeName="r" from="15" to="15" begin="0s" dur="0.8s" values="15;9;15" calcMode="linear" repeatCount="indefinite" />
			<animate attributeName="fill-opacity" from="1" to="1" begin="0s" dur="0.8s" values="1;.5;1" calcMode="linear" repeatCount="indefinite" />
		</circle>
	</svg>
</div>

<div class="page" class:full-screen={fullscreen.on}>
	<main class="page__content" bind:this={content}>
		{@render children()}
	</main>
</div>

<Footer />
