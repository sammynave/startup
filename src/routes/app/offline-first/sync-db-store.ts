import { Database } from './server-sync-db';
import { onDestroy } from 'svelte';
import { writable } from 'svelte/store';

function wsErrorHandler(error: Event) {
	console.error(error);
}

async function pushChangesSince({ database, ws, sinceVersion, serverSiteId }) {
	const changes = await database.changesSince(sinceVersion);

	// If do not update version and
	// do not attempt to send to server
	// if websocket is not open
	if (ws.readyState === WebSocket.OPEN) {
		await database.insertTrackedPeers(serverSiteId);
		ws.send(
			JSON.stringify({
				type: 'update',
				siteId: database.siteId,
				version: await database.version(),
				changes
			})
		);
	}
}

function wsMessageHandler({
	database,
	update,
	serverSiteId,
	identifier
}: {
	database: Database;
	update: () => Promise<void>;
	serverSiteId: string;
	identifier?: string;
}) {
	return async function (event: Event) {
		// Are we over subscribing here? every `store` attaches an event listener
		// maybe there's some kind of queue or something we can use to only apply
		// appropriate udpates
		if (typeof event.data !== 'string') {
			const clientSiteId = database.siteId;
			const m = await event.data.text();
			const { type, changes, siteId, version } = JSON.parse(m);

			if ((type === 'update' && siteId !== clientSiteId) || type === 'pull') {
				await database.merge(changes);
				await database.insertTrackedPeers(serverSiteId);

				await update();
			}

			if (type === 'connected') {
				await pushChangesSince({ database, ws: this, sinceVersion: version, serverSiteId });
			}
		}
	};
}

// TODO: probably need re-connect/retry logic if WS server closes connection
async function setupWs({ url, database }: { url: string; database: Promise<Database> }) {
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

export function db({ schema, name, wsUrl, serverSiteId, identifier }) {
	const databasePromise = Database.load({ schema, name });
	const wsPromise = setupWs({ url: wsUrl, database: databasePromise });
	const store = ({ query, commands }) => {
		const q = writable([]);
		databasePromise.then(async (database) => {
			const ws = await wsPromise;
			const update = async () => q.set(await query(database.db));
			// Maybe this should register the listener in a store,
			// we may be over subscribing since we add a listener with
			// every `store`
			ws.addEventListener(
				'message',
				wsMessageHandler({ database, update, identifier, serverSiteId })
			);
			await update();
		});

		const cmds = Object.fromEntries(
			Object.entries(commands).map(([name, fn]) => [
				name,
				async (args) => {
					const ws = await wsPromise;
					const db = await databasePromise;
					const results = await fn(db.db, args);
					q.set(await query(db.db));

					const [[sinceVersion]] = await db.lastTrackedChangeFor(serverSiteId);
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

	onDestroy(async () => {
		const ws = await wsPromise;
		ws.close();
	});

	return { store };
}
