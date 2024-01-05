import { nanoid } from 'nanoid';
import { Database } from './server-sync-db';
import { writable } from 'svelte/store';

const raf = globalThis.requestAnimationFrame;
function throttle(fn) {
	// could be setTimeout or raf id
	let id = null;

	return (...args) => {
		if (id === null) {
			fn(...args);
			id = typeof raf === 'undefined' ? setTimeout(() => (id = null), 60) : raf(() => (id = null));
		}
	};
}

function wsErrorHandler(error: Event) {
	console.error(error);
}

async function pushChangesSince({ database, ws, sinceVersion, serverSiteId }) {
	const changes = await database.changesSince(sinceVersion);

	// If do not update version and
	// do not attempt to send to server
	// if websocket is not open
	if (ws.readyState === WebSocket.OPEN) {
		const version = await database.version();
		if (navigator.onLine) {
			await database.insertTrackedPeers(serverSiteId, version, 1);
			ws.send(
				JSON.stringify({
					type: 'update',
					siteId: database.siteId,
					version,
					changes
				})
			);
		}
	}
}

function wsMessageHandler({
	database,
	serverSiteId
}: {
	database: Database;
	serverSiteId: string;
}) {
	return async function (event: Event) {
		// Are we over subscribing here? every `repo` attaches an event listener
		// maybe there's some kind of queue or something we can use to only apply
		// appropriate updates
		if (typeof event.data !== 'string') {
			const clientSiteId = database.siteId;
			const m = await event.data.text();
			const { type, changes, siteId, version } = JSON.parse(m);

			if ((type === 'update' && siteId !== clientSiteId) || type === 'pull') {
				await database.merge(changes);
				await database.insertTrackedPeers(serverSiteId, version, 0);
			}

			if (type === 'connected') {
				const result = await database.lastTrackedChangeFor(serverSiteId, 1);
				const trackedVersion = result?.[0]?.[0] ?? 0;
				await pushChangesSince({
					database,
					ws: this,
					sinceVersion: trackedVersion,
					serverSiteId
				});
			}
		}
	};
}

// TODO: probably need re-connect/retry logic if WS server closes connection
export async function setupWs({ url, database }: { url: string; database: Promise<Database> }) {
	const db = await database;
	const u = new URL(url);
	const features = JSON.parse(u.searchParams.get('features') as string);
	features[0].clientSiteId = db.siteId;
	features[0].clientVersion = await db.version();
	u.searchParams.set('features', JSON.stringify(features));
	const ws = new WebSocket(`${decodeURI(u.href)}`);
	ws.addEventListener('error', wsErrorHandler);
	return ws;
}

export function db({ databasePromise, wsPromise, serverSiteId, name }) {
	const self = nanoid();
	let wsListenerAdded = false;
	let channelListenerAdded = false;
	const channelSubscribers = new Set();
	const channel = 'BroadcastChannel' in globalThis ? new globalThis.BroadcastChannel(name) : null;
	const tablesToRefresh = new Set();
	const updateTabs = throttle(() => {
		const tables = [];
		for (const table of tablesToRefresh) {
			tables.push(table);
			tablesToRefresh.delete(table);
		}

		if (tables.length) {
			channel?.postMessage({ tables, sender: self });
		}
	});
	databasePromise.then(async (database) => {
		const ws = await wsPromise;
		globalThis.addEventListener('online', async (event) => {
			// Request update
			ws.send(JSON.stringify({ type: 'connected', siteId: database.siteId }));

			// // Send update
			// const result = await database.lastTrackedChangeFor(serverSiteId, 1);
			// const trackedVersion = result?.[0]?.[0] ?? 0;
			// await pushChangesSince({
			// 	database,
			// 	ws,
			// 	sinceVersion: trackedVersion,
			// 	serverSiteId
			// });
		});
	});

	const repo = ({ watch, view, commands = {} }) => {
		const q = writable([]);
		databasePromise.then(async (database) => {
			const ws = await wsPromise;
			if (wsListenerAdded === false) {
				ws.addEventListener('message', wsMessageHandler({ database, serverSiteId }));
				wsListenerAdded = true;
			}

			// Update other tabs
			channelSubscribers.add(async (event: MessageEvent) => {
				if (watch.some((table) => event.data.tables.includes(table))) {
					await q.set(await view(database.db));
				}
			});

			if (channelListenerAdded === false) {
				channel?.addEventListener('message', async (event) => {
					for (const update of channelSubscribers) {
						await update(event);
					}
				});
				channelListenerAdded = true;
			}

			// Could we do some fine-grained updates here with rowid?
			// svelte 5 might make this easier/possible. For now,
			// just re-calculate view
			database.db.onUpdate(async (type, dbName, tblName, rowid) => {
				if (watch.includes(tblName)) {
					tablesToRefresh.add(tblName);
					updateTabs();
				}
			});

			await q.set(await view(database.db));
		});

		const cmds = Object.fromEntries(
			Object.entries(commands).map(([name, fn]) => [
				name,
				async (args) => {
					const ws = await wsPromise;
					const db = await databasePromise;
					const results = await fn(db.db, args);

					const result = await db.lastTrackedChangeFor(serverSiteId, 1);
					const sinceVersion = result?.[0]?.[0] ?? 0;
					await pushChangesSince({
						database: db,
						ws,
						sinceVersion,
						serverSiteId
					});

					return results;
				}
			])
		);

		return {
			subscribe: q.subscribe,
			...cmds
		};
	};

	return {
		repo,
		database: new Promise((r) => databasePromise.then((db) => r(db)))
	};
}
