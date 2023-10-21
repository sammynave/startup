<script lang="ts">
	import SignOutButton from '$lib/components/sign-out-button.svelte';
</script>

<nav>
	<SignOutButton />
</nav>
<main>
	<slot />
</main>
<footer>footer</footer>

<style>
</style>
