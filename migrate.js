import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(migrationClient);

try {
	await migrate(db, { migrationsFolder: './drizzle' });
	console.log('SUCCESS');
} catch (e) {
	console.error('ERROR');
	console.error(e);
} finally {
	process.exit();
}
