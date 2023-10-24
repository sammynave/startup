<script lang="ts">
	import ChangePassword from './change-password.svelte';
	import * as Card from '$lib/components/ui/card';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import ChangeUsername from './change-username.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	export let data;

	$: tab = $page.url.searchParams.get('tab') || 'username';

	function setTab(tab: string | undefined) {
		const query = new URLSearchParams($page.url.searchParams.toString());
		if (tab) {
			query.set('tab', tab);
		} else {
			query.delete('tab');
		}

		goto(`?${query.toString()}`);
	}
</script>

<Card.Root class="min-w-min sm:w-[380px] mx-auto border-none shadow-none">
	<Card.Header>
		<Card.Title>Settings</Card.Title>
		<Separator />
	</Card.Header>
	<Card.Content>
		<Tabs.Root onValueChange={setTab} value={tab} class="sm:w-[380px]">
			<Tabs.List class="grid w-full grid-cols-2" autofocus>
				<Tabs.Trigger value="username">Username</Tabs.Trigger>
				<Tabs.Trigger value="password">Password</Tabs.Trigger>
			</Tabs.List>
			{#if data.usernameForm}
				<Tabs.Content value="username">
					<Card.Root>
						<Card.Header>
							<Card.Title>Username</Card.Title>
							<Card.Description>Change your username</Card.Description>
						</Card.Header>
						<Card.Content>
							<ChangeUsername form={data.usernameForm} />
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/if}
			{#if data.passwordForm}
				<Tabs.Content value="password">
					<Card.Root>
						<Card.Header>
							<Card.Title>Password</Card.Title>
							<Card.Description>Change your password here.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-2">
							<ChangePassword form={data.passwordForm} />
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	</Card.Content>
</Card.Root>
