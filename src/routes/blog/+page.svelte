<script>
	import PostGrid from '$lib/components/PostGrid.svelte';

	let { data } = $props();
</script>

<PostGrid posts={data.posts} grayCards />
