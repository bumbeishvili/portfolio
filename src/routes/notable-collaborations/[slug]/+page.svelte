<script>
	import Document from '$lib/components/Document.svelte';

	let { data } = $props();
</script>

<Document doc={data.doc} />
