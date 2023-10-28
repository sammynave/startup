import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle } from '@sveltejs/kit';
import { register } from '$lib/server/workers/example-worker.js';
import { building } from '$app/environment';
import type { Session } from 'lucia';

if (process.env.WORKER && !building) {
	await register();
}

function isAdmin(session: Session) {
	return session.user.roles.includes('admin');
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	const session = await event.locals.auth.validate();

	if (event.url.pathname.startsWith('/app')) {
		if (!session) {
			throw redirect(302, '/sign-in');
		}

		if (event.url.pathname.startsWith('/app/admin') && !isAdmin(session)) {
			throw redirect(302, '/app');
		}
		event.locals.user = session.user;
	} else if (event.route.id?.includes('/(unauthenticated)')) {
		if (session) {
			throw redirect(302, '/app');
		}
	} else if (event.route.id === '/') {
		if (session) {
			throw redirect(302, '/app');
		} else {
			throw redirect(302, '/sign-up');
		}
	}

	return await resolve(event);
};
