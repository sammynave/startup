import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	driver: 'pg',
	breakpoints: false,
	dbCredentials: {
		connectionString: process.env.DATABASE_URL as string
	}
} satisfies Config;
