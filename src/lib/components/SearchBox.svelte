<script>
	/**
	 * The search box above the All tab. It only holds the text: the page does the filtering.
	 * Escape, or the cross, clears it.
	 *
	 * @type {{ value?: string, found: number, total: number, onfocus?: () => void }}
	 */
	let { value = $bindable(''), found, total, onfocus } = $props();
</script>

<form class="search-box" role="search" onsubmit={(event) => event.preventDefault()}>
	<label class="search-box__field">
		<span class="search-box__label">Search projects</span>
		<svg class="search-box__icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
			<circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8" />
			<path d="M13 13l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
		</svg>
		<input
			type="search"
			placeholder="Search projects"
			autocomplete="off"
			spellcheck="false"
			bind:value
			{onfocus}
			onkeydown={(event) => {
				if (event.key === 'Escape') value = '';
			}}
		/>
		{#if value}
			<button class="search-box__clear" type="button" aria-label="Clear the search" onclick={() => (value = '')}>×</button>
		{/if}
	</label>
	{#if value.trim()}
		<span class="search-box__count" aria-live="polite">{found} of {total}</span>
	{/if}
</form>
