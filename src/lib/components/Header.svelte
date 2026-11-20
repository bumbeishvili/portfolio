<script>
	import { page } from '$app/state';
	import { site, menu } from '$lib/site.js';
	import { fullscreen } from '$lib/fullscreen.svelte.js';
	import Socials from './Socials.svelte';

	const year = new Date().getFullYear();

	// Projects, posts and pages show their title as the page's <h1>. Lists and the full-width
	// tool posts do not, so there the tagline takes that role.
	const hasOwnTitle = $derived(Boolean(page.data.doc) && !['tool', 'default'].includes(page.data.doc.layout));

	function toggleMenu() {
		document.body.classList.toggle('menu--open');
	}
</script>

<header class="header" class:full-screen={fullscreen.on}>
	<div class="header__content">
		<a href="/" class="header__title">
			{site.title}
		</a>

		<!-- The tagline is the page's main heading, except on pages that have a title of their own. -->
		<svelte:element this={hasOwnTitle ? 'div' : 'h1'} class="header__tagline">{site.tagline}</svelte:element>

		<div class="menu">
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div class="menu__toggle js-menu-toggle" onclick={toggleMenu}>
				<div class="menu__toggle__icon"><span></span></div>
			</div>
			<div class="menu__wrap">
				<ul class="menu__list">
					{#each menu as item (item.title)}
						<li class="menu__list__item" class:menu__list__item--parent={item.children}>
							<a
								href={item.url}
								class="menu__list__item__link"
								class:active-link={page.url.pathname === item.url}>{item.title}</a
							>
							{#if item.children}
								<ul class="menu__sublist">
									{#each item.children as child (child.title)}
										<li class="menu__sublist__item">
											<a
												href={child.url}
												class="menu__sublist__link"
												class:active-link={page.url.pathname === child.url ||
													(child.section && page.url.pathname.startsWith(child.url))}>{child.title}</a
											>
										</li>
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="header__lower">
			<Socials />

			<div class="footer__copyright">
				<span>© {year} {site.title}</span>
			</div>
		</div>
	</div>
</header>
