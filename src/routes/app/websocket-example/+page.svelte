<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import { chatStore } from '$lib/websockets/chat-store.js';
	import { presenceStore } from '$lib/websockets/presence-store.js';
	import { reloadStore } from '$lib/websockets/reload-store.js';
	import { wsStore } from '$lib/websockets/ws-store.js';
	import type { FormEvent } from 'formsnap/dist/internal';

	export let data;

	const channel = 'chat';
	const ws = wsStore({ channel });
	const chat = chatStore(ws, data.messages);
	const presence = presenceStore(ws, []);
	const reload = reloadStore(ws);

	let message = '';
	let sending = false;

	async function send(e: FormEvent) {
		e.preventDefault();
		if (sending || message.length === 0) {
			return;
		}

		try {
			sending = true;
			chat.send(message);
			message = '';
		} finally {
			sending = false;
		}
	}
</script>

<Card.Root class="min-w-min md:w-[80%] lg:w-[60%] mx-auto border-none shadow-none">
	<Card.Header class="flex flex-row items-center justify-between">
		<Card.Title>SvelteKit with WebSocket Integration</Card.Title>
		<span>{$presence.join(', ')}</span>
		<form method="post" use:enhance>
			<Button type="submit">Delete chat history</Button>
		</form>
	</Card.Header>
	<Separator />
	<Card.Content class="flex flex-col-reverse overflow-y-auto max-h-[50vh] p-4">
		<ul class="flex flex-col">
			{#each $chat as message}
				{#if message?.username === data.username}
					<li class="bg-slate-200 self-end p-2 mb-2">{message.message}</li>
				{:else if message?.username}
					<li class="p-2 mb-2">{message.username}: {message.message}</li>
				{:else}
					<li class="bg-green-200 p-2 mb-2">{message.message}</li>
				{/if}
			{:else}
				No messages
			{/each}
		</ul>
	</Card.Content>
	<Separator />
	<Card.Footer class="pt-4">
		<form on:submit={send} class="w-full">
			<Label for="message">message</Label>
			<Input class="mt-2" id="message" name="message" type="text" bind:value={message} />
			<Button class="mt-2" type="submit" disabled={sending}>Send</Button>
		</form>
		<!-- need to reference the reload store. otherwise the compiler removes it -->
		<span class="hidden">{$reload}</span>
	</Card.Footer>
</Card.Root>

<style>
	li {
		transform: translateZ(0);
	}
</style>
