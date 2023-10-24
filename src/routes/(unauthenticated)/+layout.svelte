<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { page } from '$app/stores';
	import Nav from '$lib/components/nav.svelte';
	import Main from '$lib/components/main.svelte';

	$: routeId = $page.route.id;
</script>

<Nav>
	<Button
		class={routeId === '/(unauthenticated)/sign-up' ? 'underline' : ''}
		variant="link"
		href="/sign-up">Sign up</Button
	>
	<Button
		class={routeId === '/(unauthenticated)/sign-in' ? 'underline' : ''}
		variant="link"
		href="/sign-in">Sign in</Button
	>
</Nav>
<Main>
	<slot />
</Main>
