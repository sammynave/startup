import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit';
import { register } from '$lib/server/workers/example-worker.js';
import { building } from '$app/environment';
import type { Session } from 'lucia';
// import { connectionHandler as pubSubHandler } from '$lib/server/websockets/pub-sub/handler';
// import { connectionHandler as streamHandler } from '$lib/server/websockets/streams/handler';
import { wssHandler } from '$lib/server/websockets/wss-handler';

if (process.env.WORKER && !building) {
	await register();
}

function isAdmin(session: Session) {
	return session.user.roles.includes('admin');
}

async function handleAuth({ event, session }: { event: RequestEvent; session: Session | null }) {
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
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	const session = await event.locals.auth.validate();

	await handleAuth({ event, session });

	if (!process.env.WORKER && session !== null) {
		const wss = wssHandler(session);

		if (!building) {
			if (wss !== undefined) {
				event.locals.wss = wss;
			}
		}
	}
	return await resolve(event);
};
