<script>
	import BackLink from './BackLink.svelte';

	/**
	 * Renders one content document (project, post, page...) with the layout named in its front matter.
	 *
	 *   project  title + subtitle, then the content     (projects, 3D projects, the ones in content/more)
	 *   post     title only, then the content           (blog posts, notable collaborations)
	 *   page     title + subtitle, then the content     (about, thanks)
	 *   tool     just the content, full width           (interactive tool posts)
	 *   default  just the content
	 *
	 * Projects and posts get a Back link at the top (`doc.back` is the list they belong to) and,
	 * under the title, their tags: each one opens the All tab filtered by that tag.
	 *
	 * @type {{ doc: {
	 *   url: string, layout: string, title: string, subtitle: string, html: string,
	 *   back?: string, tags?: { name: string, slug: string }[]
	 * } }}
	 */
	let { doc } = $props();
</script>

<!--
	The content is plain HTML that scripts rearrange after it is on the page (galleries, image wraps,
	embedded tools). Keying on the URL makes Svelte build it fresh for every document instead of
	patching HTML it no longer recognises.
-->
{#key doc.url}
	{#if doc.layout === 'tool' || doc.layout === 'default'}
		<div style="display: contents">
			{#if doc.layout === 'tool' && doc.back}
				<div class="back-bar"><BackLink href={doc.back} /></div>
			{/if}
			{@html doc.html}
		</div>
	{:else}
		<section class="intro">
			<div class="wrap" class:test-class={doc.layout === 'post'}>
				{#if doc.back}
					<BackLink href={doc.back} />
				{/if}
				<h1>{doc.title}</h1>
				{#if doc.layout !== 'post' && doc.subtitle}
					<p>{doc.subtitle}</p>
				{/if}
				{#if doc.tags?.length}
					<div class="tags">
						{#each doc.tags as tag (tag.slug)}
							<a class="tag" href="/all/{tag.slug}/">{tag.name}</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		<section class="single">
			<div class="wrap">
				{@html doc.html}
			</div>
		</section>
	{/if}
{/key}
