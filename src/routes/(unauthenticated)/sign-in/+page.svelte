<script lang="ts">
	import SignInForm from './sign-in-form.svelte';

	export let data;
</script>

<SignInForm form={data.form} />
