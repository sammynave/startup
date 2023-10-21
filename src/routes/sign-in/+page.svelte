<script lang="ts">
	import { enhance } from '$app/forms';

	export let form;
</script>

<form method="post" use:enhance>
	{#if form?.message}
		<p class="error">{form?.message}</p>
	{/if}
	<label for="username"
		>Username
		<input type="text" id="username" name="username" />
	</label>

	<label for="password"
		>Password
		<input id="password" name="password" type="password" />
	</label>
	<button type="submit">Sign in</button>
</form>

<a href="/sign-up">Create an account</a>

<style>
	.error {
		color: #ed4337;
	}
</style>
