<script lang="ts">
	import Main from '../../lib/components/main.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { page } from '$app/stores';
	import SignOutButton from '$lib/components/sign-out-button.svelte';
	import Nav from '$lib/components/nav.svelte';
	import * as Sheet from '$lib/components/ui/sheet';

	export let data;
	let screenSize: number;

	$: smallScreen = screenSize < 640;
	$: routeId = $page.route.id;
	$: isAdmin = data.isAdmin;
</script>

<svelte:window bind:innerWidth={screenSize} />

<Nav>
	{#if smallScreen}
		<Sheet.Root>
			<Sheet.Trigger asChild let:builder>
				<Button builders={[builder]} variant="link">Menu</Button>
			</Sheet.Trigger>
			<Sheet.Content side="right">
				<Sheet.Header>
					<Sheet.Title>Menu</Sheet.Title>
					<Sheet.Description>This is a menu</Sheet.Description>
				</Sheet.Header>
				<div class="grid gap-4 py-4">
					<Sheet.Close asChild let:builder>
						<Button
							builders={[builder]}
							class={(routeId === '/app' ? 'underline ' : ' ') + 'w-full justify-start'}
							variant="link"
							href="/app">Dashboard</Button
						>
					</Sheet.Close>
					{#if isAdmin}
						<Sheet.Close asChild let:builder>
							<Button
								builders={[builder]}
								class={(routeId === '/app/admin' ? 'underline ' : ' ') + 'w-full justify-start'}
								variant="link"
								href="/app/admin">Admin</Button
							>
						</Sheet.Close>
					{/if}
					<Sheet.Close asChild let:builder>
						<Button
							builders={[builder]}
							class={(routeId === '/app/example-background-job' ? 'underline ' : ' ') +
								'w-full justify-start'}
							variant="link"
							href="/app/example-background-job">Example background job</Button
						>
					</Sheet.Close>
					<Sheet.Close asChild let:builder>
						<Button
							data-testid="websocket-link"
							builders={[builder]}
							class={(routeId === '/app/websocket-example/combine-using-pub-sub'
								? 'underline '
								: ' ') + 'w-full justify-start'}
							variant="link"
							href="/app/websocket-example/using-pub-sub">Websocket examples</Button
						>
					</Sheet.Close>
					<Sheet.Close asChild let:builder>
						<Button
							builders={[builder]}
							class={(routeId === '/app/settings' ? 'underline ' : ' ') + 'w-full justify-start'}
							variant="link"
							href="/app/settings">Settings</Button
						>
					</Sheet.Close>
				</div>
				<Sheet.Footer>
					<SignOutButton class="w-full" />
				</Sheet.Footer>
			</Sheet.Content>
		</Sheet.Root>
	{:else}
		<Button class={routeId === '/app' ? 'underline' : ''} variant="link" href="/app"
			>Dashboard</Button
		>
		{#if isAdmin}
			<Button class={routeId === '/app/admin' ? 'underline' : ''} variant="link" href="/app/admin"
				>Admin</Button
			>
		{/if}
		<Button
			class={routeId === '/app/example-background-job' ? 'underline' : ''}
			variant="link"
			href="/app/example-background-job">Example background job</Button
		>

		<Button
			data-testid="websocket-link"
			class={routeId === '/app/websocket-example/using-pub-sub' ? 'underline' : ''}
			variant="link"
			href="/app/websocket-example/using-pub-sub">Websocket examples</Button
		>

		<Button
			class={routeId === '/app/settings' ? 'underline' : ''}
			variant="link"
			href="/app/settings">Settings</Button
		>
		<SignOutButton />
	{/if}
</Nav>
<Main>
	<slot />
</Main>
