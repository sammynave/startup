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

async function pushOfflineChangesToServer(database, ws, version) {
	const changes = await database.db.exec(
		`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
	  FROM crsql_changes WHERE site_id = crsql_site_id() AND db_version > ?`,
		[version]
	);

	const changeSiteVersions = latestVersions(changes);
	// sending so we're using the local db_version
	changeSiteVersions.forEach(async ([changeSiteId, changeDbVersion]) => {
		// await database.updateTrackedPeer(changeSiteId, changeDbVersion);
		await database.db.exec(
			`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), ?, 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`,
			[changeSiteId, changeDbVersion]
		);
	});

	// maybe this should be a POST so we can get a nicer
	// user experience. that way we can await until the
	// changes are here rather than reacting to a server
	// sent websocket message
	const message = encoder.encode(
		JSON.stringify({
			type: 'update',
			siteId: await database.siteId(),
			version: await database.version(),
			changes
		})
	);
	ws.send(message);
}

function wsMessageHandler({
	database,
	update
}: {
	database: Database;
	update: () => Promise<void>;
}) {
	return async function (event: Event) {
		// Are we over subscribing here? every `store` attaches an event listener
		// maybe there's some kind of queue or something we can use to only apply
		// appropriate udpates
		if (typeof event.data !== 'string') {
			const clientSiteId = await database.siteId();
			const m = await event.data.text();
			const { type, changes, siteId, version } = JSON.parse(m);

			if ((type === 'update' && siteId !== clientSiteId) || type === 'pull') {
				await database.merge(changes);

				const changeSiteVersions = latestVersions(changes);

				changeSiteVersions.forEach(async ([changeSiteId, changeDbVersion]) => {
					// await database.updateTrackedPeer(changeSiteId, changeDbVersion);
					await database.db.exec(
						`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
					  VALUES (unhex(?), ?, 0, 0)
					  ON CONFLICT([site_id], [tag], [event])
					  DO UPDATE SET version=excluded.version`,
						[changeSiteId, changeDbVersion]
					);
				});
				await update();
			}

			if (type === 'connected') {
				await pushOfflineChangesToServer(database, this, version);
			}
		}
	};
}

// TODO: probably need re-connect/retry logic if WS server closes connection
async function setupWs({ url, database }: { url: string; database: Promise<Database> }) {
	const db = await database;
	const u = new URL(url);
	const features = JSON.parse(u.searchParams.get('features') as string);
	features[0].clientSiteId = await db.siteId();
	features[0].clientVersion = await db.version();
	u.searchParams.set('features', JSON.stringify(features));
	const ws = new WebSocket(`${decodeURI(u.href)}`);
	ws.addEventListener('error', wsErrorHandler);
	return ws;
}

export function db({ schema, name, wsUrl }) {
	if (!browser) {
		// No SSR for now.
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
			ws.addEventListener('message', wsMessageHandler({ database, update }));
			await update();
		});

		const cmds = Object.fromEntries(
			Object.entries(commands).map(([name, fn]) => [
				name,
				async (args) => {
					const db = await databasePromise;
					const results = await fn(db.db, args);
					q.set(await query(db.db));
					const changes = await db.db.exec(
						`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
            FROM crsql_changes WHERE site_id = crsql_site_id()
            AND db_version >= crsql_db_version()`
					);

					const changeSiteVersions = latestVersions(changes);

					changeSiteVersions.forEach(async ([changeSiteId, changeDbVersion]) => {
						// await db.updateTrackedPeer(changeSiteId, changeDbVersion);
						await db.db.exec(
							`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
						VALUES (unhex(?), ?, 0, 0)
						ON CONFLICT([site_id], [tag], [event])
						DO UPDATE SET version=excluded.version`,
							[changeSiteId, changeDbVersion]
						);
					});

					const ws = await wsPromise;
					ws.send(
						encoder.encode(
							JSON.stringify({
								type: 'update',
								siteId: await db.siteId(),
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