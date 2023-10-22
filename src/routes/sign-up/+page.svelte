<script lang="ts">
	import { enhance } from '$app/forms';

	export let form;
</script>

<form method="post" use:enhance>
	{#if form?.message}
		<p class="error">{form?.message}</p>
	{/if}
	<label for="username">Username</label>
	<input type="text" id="username" name="username" />

	<label for="password"
		>Password
		<input type="password" id="password" name="password" />
	</label>
	<button type="submit">Sign up</button>
</form>
<a href="/sign-in">Sign in</a>

<style>
	.error {
		color: #ed4337;
	}
</style>
