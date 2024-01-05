<script lang="ts">
	import { nanoid } from 'nanoid';
	import { db } from './sync-db-store';
	import Input from '$lib/components/ui/input/input.svelte';

	export let dbConfig;

	let newTodo = '';
	let newTodont = '';
	let num = 100;
	const { repo } = db(dbConfig);
	const todos = repo({
		watch: ['todos'],
		view: async (db) => {
			// TODO - this gets triggered a lot
			// Maybe we can batch updates in the onUpdate trigger
			// console.log('refreshing todos view');
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
				await db.tx(async (tx) => {
					await tx.exec('DELETE FROM todos');
				});
			}
		}
	});

	const todonts = repo({
		watch: ['todonts'],
		view: async (db) => await db.execO('SELECT * FROM todonts'),
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

	const me = repo({
		watch: ['todos', 'todonts'],
		view: async (db) =>
			await db.execO('SELECT hex(crsql_site_id()) as site_id, crsql_db_version() as version')
	});

	const peers = repo({
		watch: ['crsql_tracked_peers'],
		view: async (db) =>
			await db.execO('SELECT hex(site_id) as site_id, version, event FROM crsql_tracked_peers')
	});

	const todoCount = repo({
		watch: ['todos'],
		view: async (db) => {
			const [{ count }] = await db.execO('SELECT count(*) as count FROM todos');
			return count;
		}
	});
	const todontCount = repo({
		watch: ['todonts'],
		view: async (db) => {
			const [{ count }] = await db.execO('SELECT count(*) as count FROM todonts');
			return count;
		}
	});
</script>

<div class="pt-4 pb-4 border-t">
	<form on:submit|preventDefault={async () => await todos.loadEmUp()}>
		<input type="number" bind:value={num} />
		<button type="submit">load em up</button>
	</form>
	<form on:submit|preventDefault={async () => await todos.deleteEm()}>
		<button type="submit">delete em</button>
	</form>
	<div>
		<div>server id: {dbConfig.serverSiteId}</div>
	</div>
	<div class="flex">
		{#each $me as m}
			<div class="pt-2">
				<div>me: {m.site_id}</div>
				<div>version: {m.version}</div>
			</div>
		{/each}
	</div>
	{#each $peers as peer}
		<div class="pt-2">
			<div>peer: {peer.site_id}</div>
			<div>
				tracked version: {peer.version}
				{#if peer.event === 0}received{:else}sent{/if}
			</div>
		</div>
	{/each}
	<div class="pt-4 flex gap-10">
		<div>
			<p>todos: {$todoCount}</p>
			<form
				on:submit|preventDefault={async () => {
					await todos.insert(newTodo);
					newTodo = '';
				}}
			>
				<label>new todo<Input type="text" bind:value={newTodo} /></label>
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
			<p>todonts {$todontCount}</p>
			<form
				on:submit|preventDefault={async () => {
					await todonts.insert(newTodont);
					newTodont = '';
				}}
			>
				<label>new todont<Input type="text" bind:value={newTodont} /></label>
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
</div>
