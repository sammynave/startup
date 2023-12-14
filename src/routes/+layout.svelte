<script>
	import { onMount } from 'svelte';
	import '../app.postcss';

	onMount(() => {
		// communicate that the app is ready - used for testing
		document.body.classList.add('started');
	});
</script>

<slot />
