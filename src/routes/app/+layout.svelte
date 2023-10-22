<script lang="ts">
	import Main from '../../lib/components/main.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { page } from '$app/stores';
	import SignOutButton from '$lib/components/sign-out-button.svelte';
	import Nav from '$lib/components/nav.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	let screenSize: number;

	$: smallScreen = screenSize < 640;
	$: routeId = $page.route.id;
</script>

<svelte:window bind:innerWidth={screenSize} />

<Nav>
	{#if !smallScreen}
		<Button class={routeId === '/app' ? 'underline' : ''} variant="link" href="/app"
			>Dashboard</Button
		>
		<Button
			class={routeId === '/app/example-background-job' ? 'underline' : ''}
			variant="link"
			href="/app/example-background-job">Example background job</Button
		>
		<Button
			class={routeId === '/app/settings' ? 'underline' : ''}
			variant="link"
			href="/app/settings">Settings</Button
		>
		<SignOutButton />
	{:else}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<DropdownMenu.Label>Menu</DropdownMenu.Label>
					<DropdownMenu.Separator />

					<DropdownMenu.Item>
						<Button
							class={(routeId === '/app' ? 'underline ' : ' ') + 'w-full justify-start'}
							variant="link"
							href="/app">Dashboard</Button
						>
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Button
							class={(routeId === '/app/example-background-job' ? 'underline ' : ' ') +
								'w-full justify-start'}
							variant="link"
							href="/app/example-background-job">Example background job</Button
						>
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Button
							class={(routeId === '/app/settings' ? 'underline ' : ' ') + 'w-full justify-start'}
							variant="link"
							href="/app/settings">Settings</Button
						>
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<SignOutButton class="w-full" />
					</DropdownMenu.Item>
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</Nav>
<Main>
	<slot />
</Main>
