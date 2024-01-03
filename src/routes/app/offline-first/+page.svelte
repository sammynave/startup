<script lang="ts">
	import FormInput from './../../../lib/components/ui/form/form-input.svelte';
	import { nanoid } from 'nanoid';
	import { db } from './sync-db-store.js';
	import schemaContent from '$lib/sync/schema.sql?raw';
	import { streamToString } from 'testcontainers/build/common/streams.js';

	export let data;

	let newTodo = '';
	let newTodont = '';
	let online = false;
	const { store } = db({
		schema: { name: 'schema.sql', schemaContent },
		name: data.dbName,
		wsUrl: data.url,
		serverSiteId: data.serverSiteId
	});

	const me = store({
		query: async (db) =>
			await db.execO('SELECT hex(crsql_site_id()) as site_id, crsql_db_version() as version'),
		commands: {
			requery: async (db) => undefined
		},
		identifier: 'peers'
	});
	const peers = store({
		query: async (db) => {
			return await db.execO('SELECT hex(site_id) as site_id, version FROM crsql_tracked_peers');
		},
		commands: {
			requery: async (db) => undefined
		},
		identifier: 'peers'
	});
	const count = store({
		query: async (db) => {
			const [{ count }] = await db.execO('SELECT count(*) as count FROM todos');
			return count;
		},
		commands: {
			requery: async (db) => {
				console.log('requerying count');
			}
		}
	});
	const todos = store({
		query: async (db) => {
			const todos = await db.execO('SELECT * FROM todos');
			return todos;
		},
		commands: {
			insert: async (db, name) => {
				await db.exec('INSERT INTO todos VALUES (?, ?, ?)', [nanoid(), name, 0]);
				await peers.requery();
				await me.requery();
			},
			toggle: async (db, id) => {
				await db.exec('UPDATE todos SET complete = not(complete) WHERE id = ?', [id]);

				await peers.requery();
				await me.requery();
			},

			delete: async (db, id) => {
				await db.exec('DELETE FROM todos WHERE id = ?', [id]);
				await peers.requery();
				await me.requery();
			},

			loadEmUp: async (db) => {
				console.log('gen statements');
				const stmt = `INSERT INTO todos VALUES (?, ?, 0);`;
				await db.tx(async (tx) => {
					for (let i = 0; i < 30000; i++) {
						console.log(`${i}/5000`);
						const args = [nanoid(), `name-${i}`];
						await tx.exec(stmt, args);
						// statements.push(`INSERT INTO todos VALUES ('${nanoid()}', 'name-${i}', 0);`);
					}
				});

				// console.log('done gen statements');
				// console.log('starting inserts');
				// await db.execMany(statements);
				console.log('done inserts');
				peers.requery();
				me.requery();
			}
		},
		identifier: 'todos'
	});
	const todonts = store({
		query: async (db) => await db.execO('SELECT * FROM todonts'),
		commands: {
			insert: async (db, name) => {
				await db.exec('INSERT INTO todonts VALUES (?, ?, ?)', [nanoid(), name, 0]);
				peers.requery();
				me.requery();
			},
			toggle: async (db, id) => {
				await db.exec('UPDATE todonts SET complete = not(complete) WHERE id = ?', [id]);
				peers.requery();
				me.requery();
			},
			delete: async (db, id) => {
				await db.exec('DELETE FROM todonts WHERE id = ?', [id]);
				peers.requery();
				me.requery();
			}
		},
		identifier: 'todonts'
	});
</script>

<svelte:window bind:online />
<h1>
	{#if online}Online{:else}Offline{/if}
</h1>

<button on:click|preventDefault={async () => await todos.loadEmUp()}>load em up</button>
<div>todos count: {$count}</div>
{#each $me as m}
	<div>me: {m.site_id} {m.version}</div>
{/each}
<div>server: {data.serverSiteId}</div>
{#each $peers as peer}
	<div>{peer.site_id} {peer.version}</div>
{/each}
<div class="flex gap-10">
	<div>
		<p>todos</p>
		<form
			on:submit|preventDefault={async () => {
				await todos.insert(newTodo);
				newTodo = '';
			}}
		>
			<label>new todo<input type="text" bind:value={newTodo} /></label>
			<button type="submit">create</button>
		</form>

		{#each $todos as todo}
			<div>
				<input type="checkbox" checked={todo.complete} on:click={() => todos.toggle(todo.id)} />
				{todo.id}
				{todo.content}
				<button on:click|preventDefault={() => todos.delete(todo.id)}>delete</button>
			</div>
		{/each}
	</div>

	<div>
		<p>todonts</p>
		<form
			on:submit|preventDefault={async () => {
				await todonts.insert(newTodont);
				newTodont = '';
			}}
		>
			<label>new todont<input type="text" bind:value={newTodont} /></label>
			<button type="submit">create</button>
		</form>

		{#each $todonts as todont}
			<div>
				<input
					type="checkbox"
					checked={todont.complete}
					on:click={() => todonts.toggle(todont.id)}
				/>
				{todont.id}
				{todont.content}
				<button on:click|preventDefault={() => todonts.delete(todont.id)}>delete</button>
			</div>
		{/each}
	</div>
</div>
