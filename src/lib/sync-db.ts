import initWasm, { DB } from '@vlcn.io/crsqlite-wasm';
import wasmUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;

export class Database {
	db: DB;

	static async load({ schema, name }: { schema: string[]; name: string }) {
		const sqlite = await initWasm(() => wasmUrl);
		const db = await sqlite.open(name);
		const database = new Database(db);
		await database.db.execMany(schema);
		return database;
	}

	constructor(db: DB) {
		this.db = db;
	}

	async version() {
		const [[version]] = await this.db.exec(`SELECT crsql_db_version();`);
		return version;
	}

	async siteId() {
		const [[siteId]] = await this.db.exec(`SELECT hex(crsql_site_id());`);
		return siteId;
	}

	async merge(changes) {
		// const trackedPeers = await this.db.exec(`SELECT * FROM crsql_tracked_peers`);
		// TODO: USE PREPARED STATEMENTS
		await this.db.tx(async (tx) => {
			changes.forEach(async (change) => {
				await tx.exec(INSERT_CHANGES, change);
			});
		});
	}
}
