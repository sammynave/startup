<script lang="ts">
	import { nanoid } from 'nanoid';
	import { db } from './sync-db-store';

	export let dbConfig;
	export let name = '';

	let newTodo = '';
	let newTodont = '';
	let online = false;
	let num = 100;
	const { store, database } = db(dbConfig);
	const me = store({
		watch: ['todos'],
		query: async (db) =>
			await db.execO('SELECT hex(crsql_site_id()) as site_id, crsql_db_version() as version')
	});
	const peers = store({
		watch: ['todos'],
		query: async (db) => {
			return await db.execO('SELECT hex(site_id) as site_id, version FROM crsql_tracked_peers');
		}
	});
	const count = store({
		watch: ['todos'],
		query: async (db) => {
			const [{ count }] = await db.execO('SELECT count(*) as count FROM todos');
			return count;
		}
	});
	const todos = store({
		watch: ['todos'],
		query: async (db) => {
			const todos = await db.execO('SELECT * FROM todos');
			return todos;
		},
		commands: {
			insert: async (db, name) => {
				await db.exec('INSERT INTO todos VALUES (?, ?, ?)', [nanoid(), name, 0]);
			},
			toggle: async (db, id) => {
				await db.exec('UPDATE todos SET complete = not(complete) WHERE id = ?', [id]);
			},

			delete: async (db, id) => {
				await db.exec('DELETE FROM todos WHERE id = ?', [id]);
			},

			loadEmUp: async (db) => {
				let vals = '';
				const arr = Array.from(Array(num), (_, i) => i);
				for (let i of arr) {
					vals += ` ('${nanoid()}', 'name-${i}', 0),`;
				}
				vals = vals.slice(0, -1);
				const stmt = await db.prepare(`INSERT INTO todos (id, content, complete) VALUES ${vals};`);
				await stmt.run();
				await stmt.finalize(null);
			},

			deleteEm: async (db) => {
				await db.exec('DELETE FROM todos');
			}
		}
	});

	const todonts = store({
		watch: ['todonts'],
		query: async (db) => await db.execO('SELECT * FROM todonts'),
		commands: {
			insert: async (db, name) => {
				await db.exec('INSERT INTO todonts VALUES (?, ?, ?)', [nanoid(), name, 0]);
			},
			toggle: async (db, id) => {
				await db.exec('UPDATE todonts SET complete = not(complete) WHERE id = ?', [id]);
			},
			delete: async (db, id) => {
				await db.exec('DELETE FROM todonts WHERE id = ?', [id]);
			}
		}
	});
</script>

<svelte:window bind:online />
<h1>
	{#if online}Online{:else}Offline{/if}
</h1>

<form on:submit|preventDefault={async () => await todos.loadEmUp()}>
	<input type="number" bind:value={num} />
	<button type="submit">load em up</button>
</form>
<form on:submit|preventDefault={async () => await todos.deleteEm()}>
	<button type="submit">delete em</button>
</form>
<div>todos count: {$count}</div>
{#each $me as m}
	<div>me: {m.site_id} {m.version}</div>
{/each}
<div>server: {dbConfig.serverSiteId}</div>
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
