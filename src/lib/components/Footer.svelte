<script>
	import { site } from '$lib/site.js';
	import Socials from './Socials.svelte';

	const year = new Date().getFullYear();
</script>

<!-- Only visible on small screens; on desktop the same links sit at the bottom of the sidebar. -->
<footer class="footer">
	<Socials />

	<div class="footer__copyright">
		<span>© {year} {site.title}</span>
	</div>
</footer>
