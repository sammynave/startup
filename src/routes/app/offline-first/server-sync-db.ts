import initWasm, { DB } from '@vlcn.io/crsqlite-wasm';
import wasmUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;

export class Database {
	db: DB;
	siteId: string;

	static async load({
		schema,
		name
	}: {
		schema: { name: string; schemaContent: string };
		name: string;
	}) {
		const sqlite = await initWasm(() => wasmUrl);
		const db = await sqlite.open(name);
		const [{ siteId }] = await db.execO(`SELECT hex(crsql_site_id()) as siteId;`);
		const database = new Database(db, siteId);

		await db.automigrateTo(schema.name, schema.schemaContent);
		return database;
	}

	constructor(db: DB, siteId: string) {
		this.db = db;
		this.siteId = siteId;
	}

	async version() {
		const [[version]] = await this.db.exec(`SELECT crsql_db_version();`);
		return version;
	}

	async merge(changes) {
		await this.db.tx(async (tx) => {
			const execPromises = [];

			for (const change of changes) {
				execPromises.push(tx.exec(INSERT_CHANGES, change));
			}

			await Promise.all(execPromises);
		});
	}

	async insertTrackedPeers(serverSiteId, version, event) {
		await this.db.exec(
			`INSERT INTO crsql_tracked_peers (site_id, version, tag, event)
				    VALUES (unhex(?), ?, 0, ?)
				    ON CONFLICT([site_id], [tag], [event])
				    DO UPDATE SET version=excluded.version`,
			[serverSiteId, version, event]
		);
	}

	async changesSince(since = 0) {
		return await this.db.exec(
			`SELECT "table", hex("pk") as pk, "cid", "val", "col_version", "db_version", hex("site_id") as site_id, "cl", "seq"
					  FROM crsql_changes WHERE db_version > ?`,
			[since]
		);
	}

	async lastTrackedChangeFor(siteId, event) {
		return await this.db.exec(
			`SELECT IFNULL(version, 0) version FROM crsql_tracked_peers WHERE hex(site_id) = ? AND event = ?`,
			[siteId, event]
		);
	}
}
