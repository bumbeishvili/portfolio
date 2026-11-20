<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ProjectGrid from '$lib/components/ProjectGrid.svelte';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import TagBar from '$lib/components/TagBar.svelte';

	let { data } = $props();

	// One tag has a page of its own (/all/map/). Several tags at once are an address with a query,
	// /all/?tags=d3,map, which is filtered here in the browser: a project is listed when it carries
	// any of them. The query is only read once the page is live, because the built page knows
	// nothing of it. Names in the query that are not tags are left out.
	let live = $state(false);
	onMount(() => {
		live = true;
	});

	const known = $derived(new Set(data.tags.map((tag) => tag.slug)));
	const combined = $derived(live ? (page.url.searchParams.get('tags') ?? '').split(',').filter((slug) => known.has(slug)) : []);
	const selected = $derived(combined.length ? combined : data.activeTag ? [data.activeTag] : []);

	// The search box narrows whatever the tags leave: every word typed has to appear in a project's
	// title, technologies, tags, description or year, or in the text of its page. The page texts are
	// a file of their own (/search.json), fetched the first time the box is used.
	let query = $state('');
	// The box waits behind the same button as the less used tags. While it holds text it stays in
	// view, so the list is never narrowed by something that cannot be seen.
	let more = $state(false);
	const words = $derived(query.toLowerCase().split(/\s+/).filter(Boolean));

	let pages = $state(null);
	let asked = false;
	function loadPages() {
		if (asked) return;
		asked = true;
		fetch('/search.json')
			.then((response) => response.json())
			.then((texts) => {
				pages = texts;
			})
			.catch(() => {
				asked = false; // try again on the next keystroke
			});
	}
	$effect(() => {
		if (query) loadPages(); // also when the text comes back with the page
	});
	const textOf = (project) => (pages ? `${project.search} ${pages[project.url] ?? ''}` : project.search);

	const groups = $derived(
		combined.length || words.length
			? data.groups
					.map((group) => ({
						...group,
						projects: group.projects.filter(
							(project) =>
								(!combined.length || combined.some((tag) => project.tags.includes(tag))) &&
								words.every((word) => textOf(project).includes(word))
						)
					}))
					.filter((group) => group.projects.length)
			: data.groups
	);
	const count = (list) => list.reduce((sum, group) => sum + group.projects.length, 0);

	// coming back from a project (Back, or the browser's back button) brings the search back too
	export const snapshot = {
		capture: () => ({ query, more }),
		restore: (value) => {
			query = value.query;
			more = value.more;
		}
	};

	/** Shift-click on a tag: adds it to the selection, or takes it out. */
	function toggle(slug) {
		const next = selected.includes(slug) ? selected.filter((tag) => tag !== slug) : [...selected, slug];
		const address = next.length === 0 ? '/all/' : next.length === 1 ? `/all/${next[0]}/` : `/all/?tags=${next.join(',')}`;
		goto(address, { noScroll: true, keepFocus: true });
	}
</script>

<TagBar tags={data.tags} total={data.total} {selected} ontoggle={toggle} bind:open={more} />

{#if more || query}
	<SearchBox bind:value={query} found={count(groups)} total={count(data.groups)} onfocus={loadPages} />
{/if}

{#if groups.length}
	<ProjectGrid {groups} />
{:else}
	<p class="tag-bar__empty">{words.length ? `No project matches “${query.trim()}”.` : 'No project has any of these tags.'}</p>
{/if}
