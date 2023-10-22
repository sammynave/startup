<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
	export let form;
</script>

Welcome, {data.username}

<form method="post" action="?/example-job" use:enhance>
	<button type="submit">kick off example job</button>
</form>

{#if form?.job}
	{form.job}
{/if}
