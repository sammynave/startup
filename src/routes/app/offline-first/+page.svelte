<script lang="ts">
	import { setupWs } from './sync-db-store.js';
	import schemaContent from '$lib/sync/schema.sql?raw';
	import Todos from './Todos.svelte';
	import { Database } from './server-sync-db.js';
	import { onDestroy } from 'svelte';

	export let data;

	let online = false;
	const databasePromise = Database.load({
		schema: { name: 'schema.sql', schemaContent },
		name: data.dbName
	});
	const wsPromise = setupWs({ url: data.url, database: databasePromise });

	onDestroy(async () => {
		const ws = await wsPromise;
		ws.close();
		// TODO
		// close DB, close BroadcastChannel, anything else??
		// const db = await databasePromise;
		// db.db.close();
	});
</script>

<svelte:window bind:online />

<h1>BUG</h1>
<ol>
	<li>1. open three windows, 1 private, 2 public</li>
	<li>2. add two todonts and 4 todos</li>
	<li>3. stop server</li>
	<li>4. check both todonts in private window</li>
	<li>5. check two todos in 1 public window and two todos in the other public window</li>
	<li>6. start server_id</li>
	<li>7. one of the checked todonts should be out of sync (this may take several tries)</li>
</ol>

<h1>
	{#if online}Online{:else}Offline{/if}
</h1>

<Todos
	name="todos 1"
	dbConfig={{
		name: data.dbName,
		databasePromise,
		wsPromise,
		serverSiteId: data.serverSiteId
	}}
/>

<Todos
	name="todos 2"
	dbConfig={{
		name: data.dbName,
		databasePromise,
		wsPromise,
		serverSiteId: data.serverSiteId
	}}
/>
