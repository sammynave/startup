<script lang="ts">
	import { setupWs } from './sync-db-store.js';
	import schemaContent from '$lib/sync/schema.sql?raw';
	import Todos from './Todos.svelte';
	import { Database } from './server-sync-db.js';
	import { onDestroy } from 'svelte';

	export let data;

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
