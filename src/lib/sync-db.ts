import initWasm, { DB } from '@vlcn.io/crsqlite-wasm';
import wasmUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url';

const INSERT_CHANGES = `INSERT INTO crsql_changes VALUES (?, unhex(?), ?, ?, ?, ?, unhex(?), ?, ?)`;

export class Database {
	db: DB;
	siteId: string;

	static async load({ schema, name }: { schema: string[]; name: string }) {
		const sqlite = await initWasm(() => wasmUrl);
		const db = await sqlite.open(name);
		const [{ siteId }] = await db.execO(`SELECT hex(crsql_site_id()) as siteId;`);
		const database = new Database(db, siteId);
		await database.db.execMany(schema);
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
		// TODO: USE PREPARED STATEMENTS
		await this.db.tx(async (tx) => {
			changes.forEach(async (change) => {
				await tx.exec(INSERT_CHANGES, change);
			});
		});
	}
}
