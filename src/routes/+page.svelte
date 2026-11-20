<script>
	import ProjectGrid from '$lib/components/ProjectGrid.svelte';

	let { data } = $props();
</script>

<ProjectGrid projects={data.projects} />
