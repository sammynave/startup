import { DockerComposeEnvironment } from 'testcontainers';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.testing' });

const composeFilePath = './';
const composeFile = 'docker-compose.test.yml';

export default async function startEnvironment() {
	if (process.env.CONTAINERS_RUNNING !== 'true') {
		await new DockerComposeEnvironment(composeFilePath, composeFile).up();

		const mClient = postgres(process.env.DATABASE_URL as string, { max: 1 });
		const mDb = drizzle(mClient);
		const migrationsFolder = path.join(process.cwd(), 'drizzle');
		try {
			console.log('migrating test db');
			await migrate(mDb, { migrationsFolder });
			console.log('done migrating test db');
		} catch (e) {
			console.log('MIGRATING TEST DB FAILED');
			throw e;
		}
		process.env.CONTAINERS_RUNNING = 'true';
	}
}
