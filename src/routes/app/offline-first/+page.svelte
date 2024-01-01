<script lang="ts">
	import { nanoid } from 'nanoid/non-secure';
	import { db } from './sdb.js';

	export let data;

	let newTodo = '';
	let newTodont = '';

	// import this from somewhere
	const schema = [
		`CREATE TABLE IF NOT EXISTS todos (id PRIMARY KEY NOT NULL, content, complete);`,
		`SELECT crsql_as_crr('todos');`,
		`CREATE TABLE IF NOT EXISTS todonts (id PRIMARY KEY NOT NULL, content, complete);`,
		`SELECT crsql_as_crr('todonts');`
	];

	const { store } = db({
		schema,
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
	const todos = store({
		query: async (db) => await db.execO('SELECT * FROM todos'),
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

<h1 class="font-semibold">How this works</h1>
<ol class="list-decimal ml-4">
	<li>
		Setup (catch Server up, catch the Client A up)
		<ol class="list-decimal ml-4">
			<li>initialize and/or open Client A DB</li>
			<li>Client A connect web socket (sending up clientAVersion and clientASiteID)</li>
			<li>Server queries for all updates >= clientAVersion and != clientASiteID</li>
			<li>Server `push` message with results to Client A</li>
			<li>Client A merges results and "catches up" on all changes</li>
			<li>Client A `push` all changes >= serverVersion and == clientASiteId to Server</li>
			<li>Server merges and `push` changes to Client B and Client C</li>
			<li>Client B merges change</li>
			<li>Client C merges change</li>
		</ol>
	</li>
	<li>
		Normal flow
		<ol class="list-decimal ml-4">
			<li>Client A makes update</li>
			<li>`push` update to server</li>
			<li>server merges change</li>
			<li>server `push` update to Client B and Client C</li>
			<li>Client B merges change</li>
			<li>Client C merges change</li>
		</ol>
	</li>
	<li>
		Database migrations
		<ol class="list-decimal ml-4">
			<li>???</li>
		</ol>
	</li>
</ol>
