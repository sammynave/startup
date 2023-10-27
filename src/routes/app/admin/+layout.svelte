<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	$: routeId = $page.route.id;
</script>

<div class="flex flex-row">
	<aside aria-label="Sidebar">
		<Card.Root>
			<Card.Header>
				<Card.Title>Admin nav</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col items-start">
				<Button
					class={`pl-0 ${routeId === '/app/admin' ? 'underline' : ''}`}
					variant="link"
					href="/app/admin"
				>
					Admin dashboard</Button
				>
				<Button
					class={`pl-0 ${routeId === '/app/admin/users' ? 'underline' : ''}`}
					variant="link"
					href="/app/admin/users">Users</Button
				>
			</Card.Content>
		</Card.Root>
	</aside>
	<div class="flex-grow pl-2">
		<slot />
	</div>
</div>
