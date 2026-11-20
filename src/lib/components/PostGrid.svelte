<script>
	import { masonry } from '$lib/client/masonry.js';

	/**
	 * Grid of image cards: the blog index, plus the legacy /talk/, /tool/ and /achievement/ pages.
	 * @type {{
	 *   posts: { url: string, title: string, featured_image: string, date: string, language: string, poster?: { src: string, width: number, height: number } }[],
	 *   grayCards?: boolean,
	 *   applause?: boolean
	 * }}
	 */
	let { posts, grayCards = false, applause = false } = $props();

	// a card thumbnail is a still image or, like the project cards, a short looping clip
	const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src);
</script>

<section class="blog">
	<div
		class="content-wrap blog-wrap"
		class:gray-cards={grayCards}
		use:masonry={{ itemSelector: '.blog-post', watchItems: true, items: posts }}
	>
		{#each posts as post (post.url)}
			<article class="blog-post">
				<a class="blog-post__link" href={post.url} aria-label={post.title}>
					<div class="blog-post__image">
						{#if isVideo(post.featured_image)}
							<video loop muted playsinline autoplay width="100%">
								<source src={post.featured_image} type="video/mp4" />
							</video>
						{:else if post.poster}
							<!-- the light copy of the picture (tools/gh/posters.js); the first few are fetched at once -->
							<img
								src={post.poster.src}
								width={post.poster.width}
								height={post.poster.height}
								alt={post.title}
								loading={posts.indexOf(post) < 4 ? 'eager' : 'lazy'}
								fetchpriority={posts.indexOf(post) === 0 ? 'high' : undefined}
							/>
						{:else}
							<img src={post.featured_image} alt={post.title} />
						{/if}
					</div>

					<div class="blog-post__content">
						<div class="blog-post__info">
							<h2 class="blog-post__title">{post.title}</h2>
							<p class="blog-post__subtitle">{post.date}</p>
							<p class="blog-post__subtitle">{post.language}</p>
						</div>
					</div>

					{#if applause}
						<!-- left over from the old theme: renders as a small white dot on the card -->
						<applause-button
							class="outer"
							style="position:absolute;width: 28px; height: 28px;z-index:999;bottom:5px;left:5px;"
						></applause-button>
					{/if}
				</a>
			</article>
		{/each}
	</div>
</section>
