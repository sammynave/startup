import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit';
import { register } from '$lib/server/workers/example-worker.js';
import { building } from '$app/environment';
import type { Session } from 'lucia';
import { connectionHandler } from '$lib/server/websockets/pub-sub/handler';
import { getWss, type ExtendedWebSocketServer } from '$lib/server/websockets/utils';

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

let wssInitialized = false;
function startupWebsocketServer(wss: ExtendedWebSocketServer) {
	if (wssInitialized) {
		return;
	}
	// Handle weirdness with HMR
	// TODO: only do this in dev?
	if (wssInitialized === false && typeof wss !== 'undefined') {
		wss.removeAllListeners();
		wss.clients.clear();
	}

	if (typeof wss !== 'undefined') {
		wss.on('connection', connectionHandler(wss));
		wssInitialized = true;
	}
	return wss;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	const session = await event.locals.auth.validate();

	await handleAuth({ event, session });

	if (!process.env.WORKER) {
		const wss = getWss();
		startupWebsocketServer(wss);

		if (!building) {
			if (wss !== undefined) {
				event.locals.wss = wss;
			}
		}
	}
	return await resolve(event);
};
