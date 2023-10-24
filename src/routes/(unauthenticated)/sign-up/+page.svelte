<script lang="ts">
	import type { PageData } from './$types';
	import SignUpForm from './sign-up-form.svelte';

	export let data: PageData;
</script>

<SignUpForm form={data.form} />
