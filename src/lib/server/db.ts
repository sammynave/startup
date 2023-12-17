import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './db/schema.js';

// Need to use this because $env fails in playwright
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL as string;

export const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
