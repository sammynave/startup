import { client, create } from '../../redis-client';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';
import { dbFrom } from '$lib/server/sync-db/db';
import type BetterSqlite3 from 'better-sqlite3';
import { WebSocket } from 'ws';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;

// TODO: review https://github.com/vlcn-io/js/blob/main/packages/ws-server/src/DB.ts
// see if any edge cases have been missed

export class Sync {
	private stream: string;
	private ws: ExtendedWebSocket;
	private userId: string;
	private redisClient: Redis = client();
	private db: ReturnType<typeof BetterSqlite3>;
	private siteId: string;
	insertChangesStatement: BetterSqlite3.Statement;
	insertTrackedPeersStatement: BetterSqlite3.Statement;

	/*
	 This is the preferred way to instantiate this class for 2 reasons:
	  1. If we use the class in multiple places, we want to avoid duplicating all of this setup.
	 	2. Constructors can not be asynchronous so the only way to encapsulate the setup is through
		   a static method
	*/
	static async init({
		ws,
		stream,
		clientSiteId,
		clientVersion
	}: {
		stream: string;
		ws: ExtendedWebSocket;
		clientSiteId: string;
		clientVersion: number;
	}) {
		const db = dbFrom(`${ws.session.user.userId}.db`);
		const { siteId } = db.prepare('SELECT hex(crsql_site_id()) as siteId;').get();
		const sync = new Sync({ ws, stream, db, siteId });

		const subClient = create();
		await subClient.subscribe(sync.stream, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});

		const subscription = await subClient.on('messageBuffer', (stream, message) => {
			sync.insertTrackedPeersStatement.run(clientSiteId);

			sync.send(message);
		});

		ws.on('message', async (data) => {
			const parsed = JSON.parse(data.toString());
			const changes = parsed.changes;
			if (parsed.type === 'update') {
				changes.forEach((change) => {
					sync.insertChangesStatement.run(...change);
				});

				const fromSiteId = parsed.siteId;

				sync.insertTrackedPeersStatement.run(fromSiteId);

				await sync.receive(data);
			}
		});

		ws.on('close', async () => {
			await subscription.unsubscribe();
		});

		// Make sure this happens AFTER event handlers are declared
		sync.catchUpServer(clientSiteId);
		sync.catchUpClient(clientSiteId);

		return sync;
	}

	private constructor({
		ws,
		stream,
		db,
		siteId
	}: {
		ws: ExtendedWebSocket;
		stream: string;
		db: ReturnType<typeof Database>;
		siteId: string;
	}) {
		this.stream = stream;
		this.ws = ws;
		this.userId = ws.session.user.userId;
		this.db = db;
		this.siteId = siteId;
		this.insertChangesStatement = db.prepare(INSERT_CHANGES);
		this.insertTrackedPeersStatement =
			db.prepare(`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
		VALUES (unhex(?), crsql_db_version(), 0, 0)
		ON CONFLICT([site_id], [tag], [event])
		DO UPDATE SET version=excluded.version`);
	}

	catchUpServer(clientSiteId) {
		// Here we can send down the last seen id or something.
		// that way we don't need the entire contents of the db

		const result = this.db
			.prepare(`SELECT version FROM crsql_tracked_peers WHERE site_id = unhex(?)`)
			.get(clientSiteId);
		const version = result?.version ?? 0;
		this.send(JSON.stringify({ type: 'connected', siteId: clientSiteId, version }));
	}

	catchUpClient(clientSiteId: string) {
		// ALL
		const changes = this.db
			.prepare(
				`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
				FROM crsql_changes WHERE site_id != unhex(:clientSiteId)
				`
			)
			.all({
				clientSiteId
			});
		this.insertTrackedPeersStatement.run(clientSiteId);

		const { version } = this.db.prepare(`SELECT crsql_db_version() as version;`).get();

		if (changes.length) {
			const message = JSON.stringify({
				type: 'pull',
				siteId: this.siteId,
				version: version,
				changes: changes.map((change) => Object.values(change))
			});
			this.send(message);
		}
	}

	private send(message) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message, { binary: true });
		}
	}

	private async receive(message: Buffer) {
		await this.redisClient.publish(this.stream, message);
	}
}
