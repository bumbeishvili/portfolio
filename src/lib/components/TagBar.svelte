<script>
	/**
	 * The row of tags above the All tab. Each tag is a link to the same list showing only the
	 * projects with that tag; "All" clears the filter. Each shows how many projects it lists.
	 *
	 * Only the most used tags are shown; the rest sit behind a button, which also opens the search
	 * box (the page owns that: `open` is bound). A selected tag always stays in view. Every tag is
	 * in the page either way, so search engines find them all.
	 *
	 * Shift-click combines tags: it adds the tag to the ones already selected (or takes it out)
	 * instead of replacing them, and the list then shows the projects that have any of them.
	 *
	 * @type {{
	 *   tags: { name: string, slug: string, count: number }[],
	 *   total: number,
	 *   selected?: string[],
	 *   ontoggle?: (slug: string) => void,
	 *   visible?: number,
	 *   open?: boolean
	 * }}
	 */
	let { tags, total, selected = [], ontoggle, visible = 8, open = $bindable(false) } = $props();

	const extra = $derived(Math.max(0, tags.length - visible));

	function click(event, slug) {
		if (!event.shiftKey || !ontoggle) return;
		event.preventDefault(); // a shift-click on a link would open a new window
		ontoggle(slug);
	}
</script>

<nav class="tag-bar" aria-label="Filter projects by tag">
	<a class="tag" class:tag--active={!selected.length} href="/all/" data-sveltekit-noscroll>
		All<span class="tag__count">{total}</span>
	</a>
	{#each tags as tag, index (tag.slug)}
		<a
			class="tag"
			class:tag--active={selected.includes(tag.slug)}
			href="/all/{tag.slug}/"
			title="Shift-click to combine with the selected tags"
			hidden={index >= visible && !open && !selected.includes(tag.slug)}
			data-sveltekit-noscroll
			onclick={(event) => click(event, tag.slug)}
		>
			{tag.name}<span class="tag__count">{tag.count}</span>
		</a>
	{/each}
	<!-- the button also opens the search box, so it is there even when every tag fits -->
	<button class="tag tag--more" class:tag--open={open} type="button" aria-expanded={open} onclick={() => (open = !open)}>
		{open ? 'Show less' : 'Search and more tags'}{#if !open && extra}<span class="tag__count">{extra}</span>{/if}
	</button>
</nav>
