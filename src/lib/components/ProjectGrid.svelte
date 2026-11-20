<script>
	import { cardVideo } from '$lib/client/card-video.js';
	import { masonry } from '$lib/client/masonry.js';

	/**
	 * Grid of project cards: home (featured), 2D (/2d/), 3D (/gl/) and Notable Collaborations.
	 *
	 * Pass `projects` for one plain grid, or `groups` for several grids with a divider above each,
	 * which is how the All tab (/all/) shows its projects year by year.
	 *
	 * @typedef {{ url: string, title: string, subtitle: string, featured_image: string, top: string, poster?: { src: string, width: number, height: number, small?: string } }} Project
	 * @type {{ projects?: Project[], groups?: { title: string | number, projects: Project[] }[] }}
	 */
	let { projects = [], groups = undefined } = $props();

	const sections = $derived(groups ?? [{ title: '', projects }]);

	// Most cards have a short looping video as their thumbnail; a few (blog posts) have a still image.
	const isVideo = (src) => /\.(mp4|webm|mov)$/i.test(src);

	// The first cards are on screen when the page opens, so their stills are fetched at once.
	// The rest wait until the visitor scrolls near them.
	const first = $derived(new Set(sections[0]?.projects.slice(0, 6).map((project) => project.url)));
</script>

<section class="portfolio">
	{#each sections as section (section.title)}
		{#if section.title}
			<h2 class="portfolio-divider">{section.title}</h2>
		{/if}

		<div
			class="content-wrap portfolio-wrap gray-cards"
			use:masonry={{ itemSelector: '.portfolio-item', watchItems: true, items: section.projects }}
		>
			{#each section.projects as project (project.url)}
				<div class="portfolio-item">
					<a class="portfolio-item__link" href={project.url}>
						<div class="portfolio-item__image">
							{#if isVideo(project.featured_image) && project.poster}
								<!-- a still of the first frame; the clip on top of it is fetched when the card comes into view -->
								<img
									src={project.poster.src}
									width={project.poster.width}
									height={project.poster.height}
									alt={project.title}
									loading={first.has(project.url) ? 'eager' : 'lazy'}
									fetchpriority={project.url === sections[0]?.projects[0]?.url ? 'high' : undefined}
								/>
								<video class="portfolio-item__clip" loop muted playsinline preload="none" use:cardVideo={{ src: project.featured_image, small: project.poster.small }}></video>
							{:else if isVideo(project.featured_image)}
								<video loop muted playsinline autoplay width="100%">
									<source src={project.featured_image} type="video/mp4" />
								</video>
							{:else if project.poster}
								<img
									src={project.poster.src}
									width={project.poster.width}
									height={project.poster.height}
									alt={project.title}
									loading={first.has(project.url) ? 'eager' : 'lazy'}
								/>
							{:else}
								<img src={project.featured_image} alt={project.title} />
							{/if}
						</div>

						<div class="portfolio-item__content">
							<div class="portfolio-item__info">
								<div>{project.top}</div>
								<h2 class="portfolio-item__title">{project.title}</h2>
								<p class="portfolio-item__subtitle">{project.subtitle}</p>
							</div>
						</div>
					</a>
				</div>
			{/each}
		</div>
	{/each}
</section>
