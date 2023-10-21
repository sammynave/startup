import { lucia } from 'lucia';
import { sveltekit } from 'lucia/middleware';
import { postgres as postgresAdapter } from '@lucia-auth/adapter-postgresql';
import { client } from './db.js';
import { dev } from '$app/environment';

export const auth = lucia({
	env: dev ? 'DEV' : 'PROD',
	middleware: sveltekit(),
	adapter: postgresAdapter(client, {
		user: 'users',
		key: 'user_keys',
		session: 'user_sessions'
	})
});

export type Auth = typeof auth;
