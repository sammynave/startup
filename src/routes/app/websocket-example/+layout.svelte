<script>
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	$: routeId = $page.route.id;
</script>

<div class="container mx-auto flex flex-row justify-center align-middle">
	<Button
		class={routeId === '/app/websocket-example/using-pub-sub' ? 'underline' : ''}
		variant="link"
		href="/app/websocket-example/using-pub-sub"
	>
		Redis pub/sub
	</Button>

	<Button
		class={routeId === '/app/websocket-example/using-streams' ? 'underline' : ''}
		variant="link"
		href="/app/websocket-example/using-streams"
	>
		Redis streams
	</Button>
</div>

<slot />
