<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from './ui/button/button.svelte';

	let className: string = '';
	export { className as class };
</script>

<form class="flex {className}" method="post" action="/app?/sign-out" use:enhance>
	<Button class="w-full justify-start hover:underline" variant="link" type="submit">Sign out</Button
	>
</form>
