import { client, create } from '../../redis-client';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';
import { dbFrom } from '$lib/server/sync-db/db';
import type BetterSqlite3 from 'better-sqlite3';
import { WebSocket } from 'ws';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;
const INSERT_TRACKED_PEERS = `INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
VALUES (unhex(?), crsql_db_version(), 0, 0)
ON CONFLICT([site_id], [tag], [event])
DO UPDATE SET version=excluded.version`;
const SELECT_VERSION = `SELECT crsql_db_version() as version;`;
const SELECT_NON_CLIENT_CHANGES = `SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
FROM crsql_changes WHERE site_id != unhex(:clientSiteId) AND db_version >= :dbVersion`;
const SELECT_VERSION_FROM_TRACKED_PEER = `SELECT version FROM crsql_tracked_peers WHERE site_id = unhex(?)`;

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
	versionStatement: BetterSqlite3.Statement;
	nonClientChanges: BetterSqlite3.Statement;
	versionOfTrackedPeer: BetterSqlite3.Statement;

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
		const sync = new Sync({ ws, stream, name: `${ws.session.user.userId}.db` });

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

		ws.on('message', sync.onMessage.bind(sync));
		ws.on('close', async () => await subscription.unsubscribe());

		// Make sure this happens AFTER event handlers are declared
		sync.pull(clientSiteId);
		sync.push(clientSiteId);

		return sync;
	}

	private constructor({
		ws,
		stream,
		name
	}: {
		ws: ExtendedWebSocket;
		stream: string;
		name: string;
	}) {
		this.stream = stream;
		this.ws = ws;
		this.userId = ws.session.user.userId;

		const db = dbFrom(name);
		this.db = db;
		const { siteId } = db.prepare('SELECT hex(crsql_site_id()) as siteId;').get();
		this.siteId = siteId;
		this.insertChangesStatement = db.prepare(INSERT_CHANGES);
		this.insertTrackedPeersStatement = db.prepare(INSERT_TRACKED_PEERS);
		this.versionStatement = db.prepare(SELECT_VERSION);
		this.nonClientChanges = db.prepare(SELECT_NON_CLIENT_CHANGES);
		this.versionOfTrackedPeer = db.prepare(SELECT_VERSION_FROM_TRACKED_PEER);
	}

	async onMessage(data) {
		const parsed = JSON.parse(data.toString());
		const changes = parsed.changes;
		if (parsed.type === 'update') {
			this.merge(changes);

			const fromSiteId = parsed.siteId;
			this.insertTrackedPeersStatement.run(fromSiteId);

			await this.redisClient.publish(this.stream, data);
		}
	}

	private merge(changes) {
		const insertChanges = this.db.transaction((changes) => {
			for (const change of changes) {
				this.insertChangesStatement.run(...change);
			}
		});
		insertChanges(changes);
	}

	private pull(clientSiteId: string) {
		const result = this.versionOfTrackedPeer.get(clientSiteId);
		const version = result?.version ?? 0;
		console.log('pull');
		this.send(JSON.stringify({ type: 'connected', siteId: clientSiteId, version }));
	}

	private push(clientSiteId: string) {
		const result = this.versionOfTrackedPeer.get(clientSiteId);
		const changes = this.nonClientChanges.all({ clientSiteId, dbVersion: result?.version ?? 0 });
		const { version } = this.versionStatement.get();

		if (changes.length) {
			const message = JSON.stringify({
				type: 'pull',
				siteId: this.siteId,
				version,
				changes: changes.map((change) => Object.values(change))
			});
			this.send(message, clientSiteId);
		}
	}

	private send(message, clientSiteId: string | undefined = undefined) {
		if (this.ws.readyState === WebSocket.OPEN) {
			// Only update if we send the message
			/// might want an ACK from client before we do this
			if (clientSiteId) {
				this.insertTrackedPeersStatement.run(clientSiteId);
			}
			this.ws.send(message, { binary: true });
		}
	}
}
