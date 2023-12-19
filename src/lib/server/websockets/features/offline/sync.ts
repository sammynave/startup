import { client, create } from '../../redis-client';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';
import { dbFrom } from '$lib/server/sync-db/db';
import type Database from 'better-sqlite3';
import { WebSocket } from 'ws';
import { latestVersions } from '../../../../../routes/app/offline-first/sdb';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;

// TODO: review https://github.com/vlcn-io/js/blob/main/packages/ws-server/src/DB.ts
// see if any edge cases have been missed

export class Sync {
	private stream: string;
	private ws: ExtendedWebSocket;
	private userId: string;
	private redisClient: Redis = client();
	private db: ReturnType<typeof Database>;
	private version: number;
	private siteId: string;

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
		const db = await dbFrom(`${ws.session.user.userId}.db`);
		const { siteId, version } = await db
			.prepare('SELECT hex(crsql_site_id()) as siteId, crsql_db_version() as version;')
			.get();
		const sync = new Sync({ ws, stream, db, version, siteId });

		const subClient = create();
		await subClient.subscribe(sync.stream, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});

		const subscription = await subClient.on('messageBuffer', (stream, message) => {
			sync.notify(message);
		});

		ws.on('message', async (data) => {
			const parsed = JSON.parse(data.toString());
			const changes = parsed.changes;
			if (parsed.type === 'update') {
				/*
					some client is sending an update to the server
					which then is forwarded to all clients -> `sync.recieve(data)`
					this can be triggered in two ways:
					1. client inserts a new entry and sends an update
					2. client receives a message of `type: 'connected'`, then it sends up all changes
				*/
				changes.forEach(async (change, i) => {
					await db.prepare(INSERT_CHANGES).run(...change);
				});

				const changeSiteVersions = latestVersions(changes);

				changeSiteVersions.forEach(async ([changeSiteId, changeDbVersion]) => {
					await db
						.prepare(
							`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), ?, 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`
						)
						.run(changeSiteId, changeDbVersion);
				});

				await sync.receive(data);
			}
		});

		ws.on('close', async () => {
			await subscription.unsubscribe();
		});

		// Make sure this happens AFTER event handlers are declared
		await sync.catchUpClient(clientSiteId);
		await sync.catchUpServer(clientSiteId);

		return sync;
	}

	private constructor({
		ws,
		stream,
		db,
		version,
		siteId
	}: {
		ws: ExtendedWebSocket;
		stream: string;
		db: ReturnType<typeof Database>;
		version: number;
		siteId: string;
	}) {
		this.stream = stream;
		this.ws = ws;
		this.userId = ws.session.user.userId;
		this.db = db;
		this.version = version;
		this.siteId = siteId;
	}

	async catchUpServer(clientSiteId) {
		// Here we can send down the last seen id or something.
		// that way we don't need the entire contents of the db

		const result = await this.db
			.prepare(`SELECT version FROM crsql_tracked_peers WHERE site_id = unhex(?)`)
			.get(clientSiteId);
		const version = result?.version ?? 0;
		await this.notify(JSON.stringify({ type: 'connected', siteId: clientSiteId, version }));
	}

	async catchUpClient(clientSiteId: string) {
		// Maybe we can do something to only send down what's needed.
		// just updates after the last update by `${clientSiteId}

		const result = await this.db
			.prepare(`SELECT version FROM crsql_tracked_peers WHERE site_id = unhex(?)`)
			.get(clientSiteId);
		const lastVersion = result?.version ?? 0;

		const changes = await this.db
			.prepare(
				`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
				FROM crsql_changes WHERE site_id != unhex(:clientSiteId)
				AND db_version > :lastVersion`
			)
			.all({
				clientSiteId,
				lastVersion
			});

		const changeSiteVersions = latestVersions(changes.map((change) => Object.values(change)));

		changeSiteVersions.forEach(async ([changeSiteId, changeDbVersion]) => {
			await this.db
				.prepare(
					`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), ?, 0, 0)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`
				)
				.run(changeSiteId, changeDbVersion);
		});

		if (changes.length) {
			const message = JSON.stringify({
				type: 'pull',
				siteId: this.siteId,
				version: this.version,
				changes: changes.map((change) => Object.values(change))
			});
			this.notify(message);
		}
	}

	private notify(message) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message, { binary: true });
		}
	}

	private async publishMessage(message: ArrayBufferLike) {
		await this.redisClient.lpush(this.stream, message);
		await this.redisClient.publish(this.stream, message);
	}

	private async receive(message: Buffer) {
		await this.publishMessage(message);
	}
}
