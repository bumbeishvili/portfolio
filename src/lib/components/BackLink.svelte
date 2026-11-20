<script>
	import { trail } from '$lib/trail.svelte.js';

	/**
	 * "Back" at the top of a project or post.
	 *
	 * If the visitor came from another page of the site, it goes back to exactly where they were
	 * (same page, same scroll position). If they landed here directly, it is a plain link to `href`,
	 * the list this page belongs to.
	 *
	 * @type {{ href: string }}
	 */
	let { href } = $props();

	/** @param {MouseEvent} event */
	function back(event) {
		// new-tab clicks and direct landings just follow the link
		if (!trail.inSite || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		history.back();
	}
</script>

<a class="back-link" {href} onclick={back}>Back</a>
