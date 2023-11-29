import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle, type RequestEvent } from '@sveltejs/kit';
import { register } from '$lib/server/workers/example-worker.js';
import { building } from '$app/environment';
import type { Session } from 'lucia';
import type { ExtendedWebSocketServer } from '../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { servers } from '../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { COMBINED_PATH } from '$lib/websockets/constants';
import { connectionHandler } from '$lib/server/websockets/handler';
import { WebSocket } from 'ws';

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

let combinedWssInitialized = false;
function startupCombinedWebsocketServer(wss: ExtendedWebSocketServer) {
	if (combinedWssInitialized) {
		return;
	}
	// Handle weirdness with HMR
	// We need to manually remove listeners created in this file,
	// other wise we never clean them up when HMR reloads
	if (combinedWssInitialized === false && typeof wss !== 'undefined') {
		wss.listeners('connection').forEach((listener) => {
			if (listener.name === 'hooksConnectionHandler') {
				wss.removeListener('connection', listener);
				const openClients = [...wss.clients].filter(
					(client) => client.readyState !== WebSocket.OPEN
				);
				wss.clients.clear();
				openClients.forEach((client) => {
					wss.clients.add(client);
				});
			}
		});
	}

	if (typeof wss !== 'undefined') {
		wss.on('connection', connectionHandler(wss));
		combinedWssInitialized = true;
	}
	return wss;
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	const session = await event.locals.auth.validate();

	await handleAuth({ event, session });

	if (!process.env.WORKER) {
		const wss = servers[COMBINED_PATH].getWss();

		startupCombinedWebsocketServer(wss);

		if (!building) {
			if (wss !== undefined) {
				event.locals.wss = wss;
			}
		}
	}
	return await resolve(event);
};
