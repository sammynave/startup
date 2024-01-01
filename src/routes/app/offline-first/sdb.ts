import { browser } from '$app/environment';
import { Database } from '$lib/sync-db';
import { onDestroy } from 'svelte';
import { readable, writable } from 'svelte/store';

const encoder = new TextEncoder();

function wsErrorHandler(error: Event) {
	console.error(error);
}

export function latestVersions(changes) {
	return Object.entries(
		changes.reduce((acc, change) => {
			const siteId = change[6];
			const version = change[5];
			if (acc[siteId]) {
				acc[siteId] = acc[siteId] > version ? acc[siteId] : version;
			} else {
				acc[siteId] = version;
			}
			return acc;
		}, {})
	);
}

async function pushOfflineChangesToServer(database, ws, version, serverSiteId) {
	// const changes = await database.db.exec(
	// 	`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
	//   FROM crsql_changes WHERE site_id = crsql_site_id() AND db_version >= ?`,
	// 	[version ? version - 1 : 0]
	// );

	// ALL
	const changes = await database.db.exec(
		`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
	  FROM crsql_changes`
	);

	// sending so we're using the local db_version
	await database.db.exec(
		`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), crsql_db_version(), 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`,
		[serverSiteId]
	);

	// maybe this should be a POST so we can get a nicer
	// user experience. that way we can await until the
	// changes are here rather than reacting to a server
	// sent websocket message
	const message = encoder.encode(
		JSON.stringify({
			type: 'update',
			siteId: database.siteId,
			version: await database.version(),
			changes
		})
	);
	ws.send(message);
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
				await database.db.exec(
					`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), crsql_db_version(), 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`,
					[serverSiteId]
				);

				await update();
			}

			if (type === 'connected') {
				await pushOfflineChangesToServer(database, this, version, serverSiteId);
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
	if (!browser) {
		// No SSR
		return { store: () => readable([]) };
	}
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
					const db = await databasePromise;
					const results = await fn(db.db, args);
					q.set(await query(db.db));

					const serverSiteVersion = await db.db.execO(
						`SELECT version FROM crsql_tracked_peers WHERE site_id = unhex(?)`,
						[serverSiteId]
					);
					// const v = serverSiteVersion[0]?.version ? serverSiteVersion[0].version - 1 : 0;
					// const changes = await db.db.exec(
					// 	`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
					//   FROM crsql_changes WHERE db_version >= ?`,
					// 	[v]
					// );
					// ALL
					const changes = await db.db.exec(
						`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
					  FROM crsql_changes`
					);

					await db.db.exec(
						`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), crsql_db_version(), 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`,
						[serverSiteId]
					);

					const ws = await wsPromise;
					ws.send(
						encoder.encode(
							JSON.stringify({
								type: 'update',
								siteId: db.siteId,
								version: await db.version(),
								changes
							})
						)
					);
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
