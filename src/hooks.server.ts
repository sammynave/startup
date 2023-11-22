import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit';
import { register } from '$lib/server/workers/example-worker.js';
import { building } from '$app/environment';
import type { Session } from 'lucia';
import { connectionHandler as pubSubHandler } from '$lib/server/websockets/pub-sub/handler';
import { connectionHandler as streamHandler } from '$lib/server/websockets/streams/handler';
import type { ExtendedWebSocketServer } from '$lib/server/websockets/utils';
import { servers } from '$lib/server/websockets/utils';
import { PUB_SUB_PATH, STREAMS_PATH } from '$lib/websockets/constants';

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

let psWssInitialized = false;
function startupPubSubWebsocketServer(wss: ExtendedWebSocketServer) {
	if (psWssInitialized) {
		return;
	}
	// Handle weirdness with HMR
	// TODO: only do this in dev?
	if (psWssInitialized === false && typeof wss !== 'undefined') {
		wss.removeAllListeners();
		wss.clients.clear();
	}

	if (typeof wss !== 'undefined') {
		wss.on('connection', pubSubHandler(wss));
		psWssInitialized = true;
	}
	return wss;
}
let sWssInitialized = false;
function startupStreamsWebsocketServer(wss: ExtendedWebSocketServer) {
	if (sWssInitialized) {
		return;
	}
	// Handle weirdness with HMR
	// TODO: only do this in dev?
	if (sWssInitialized === false && typeof wss !== 'undefined') {
		wss.removeAllListeners();
		wss.clients.clear();
	}

	if (typeof wss !== 'undefined') {
		wss.on('connection', streamHandler(wss));
		sWssInitialized = true;
	}
	return wss;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	const session = await event.locals.auth.validate();

	await handleAuth({ event, session });

	if (!process.env.WORKER) {
		const psWss = servers[PUB_SUB_PATH].getWss();
		const sWss = servers[STREAMS_PATH].getWss();

		startupPubSubWebsocketServer(psWss);
		startupStreamsWebsocketServer(sWss);

		if (!building) {
			if (psWss !== undefined) {
				event.locals.psWss = psWss;
			}
			if (sWss !== undefined) {
				event.locals.sWss = sWss;
			}
		}
	}
	return await resolve(event);
};
