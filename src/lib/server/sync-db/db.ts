import Database from 'better-sqlite3';
import { extensionPath } from '@vlcn.io/crsqlite';

export async function dbFrom(filename) {
	// TODO: should be an env-var so we can use Render's persistent disk as the path
	const db = new Database(`./sync-dbs/${filename}`);
	db.pragma('journal_mode = WAL');
	db.loadExtension(extensionPath);

	// TODO: import schema from same place as frontend
	await db.exec(`CREATE TABLE IF NOT EXISTS todos (id PRIMARY KEY NOT NULL, content, complete);
		SELECT crsql_as_crr('todos');
		CREATE TABLE IF NOT EXISTS todonts (id PRIMARY KEY NOT NULL, content, complete);
		SELECT crsql_as_crr('todonts');
	`);
	return db;
}
