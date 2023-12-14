import type { PlaywrightTestConfig } from '@playwright/test';

// NOTE: this file is ignored by the vite reloader.
// import type { FullConfig } from '@playwright/test';
import { DockerComposeEnvironment } from 'testcontainers';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.testing' });

const composeFilePath = './';
const composeFile = 'docker-compose.test.yml';
const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
const POSTGRES_DB = process.env.POSTGRES_DB;
const REDIS_WS_PASSWORD = process.env.REDIS_WS_PASSWORD;

if (process.env.CONTAINERS_RUNNING !== 'true') {
	const e = await new DockerComposeEnvironment(composeFilePath, composeFile).up();
	const redis = await e.getContainer('websocket-kv-testing-1');
	const redisConnectionString = `redis://:${REDIS_WS_PASSWORD}@${redis.getHost()}:${redis.getFirstMappedPort()}`;
	const db = await e.getContainer('db-testing-1');
	const dbConnectionString = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${db.getHost()}:${db.getFirstMappedPort()}/${POSTGRES_DB}`;

	const mClient = postgres(dbConnectionString, { max: 1 });
	const mDb = drizzle(mClient);
	const migrationsFolder = path.join(process.cwd(), 'drizzle');
	try {
		console.log('migrating test db');
		await migrate(mDb, { migrationsFolder });
		console.log('done migrating test db');
	} catch (e) {
		console.log('MIGRATING TEST DB FAILED');
		console.log(e);
	}
	process.env.REDIS_WS_SERVER = redisConnectionString;
	process.env.DATABASE_URL = dbConnectionString;
	process.env.CONTAINERS_RUNNING = 'true';
}

const config: PlaywrightTestConfig = {
	// webServer: {
	// 	command: 'pnpm run build --mode testing && pnpm run preview --mode testing',
	// 	port: 4173,
	// 	stdout: 'pipe'
	// },
	// globalSetup: './playwright-setup.ts',
	webServer: {
		command: 'pnpm run dev --mode testing',
		port: 5173,
		stdout: 'pipe',
		reuseExistingServer: false
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
