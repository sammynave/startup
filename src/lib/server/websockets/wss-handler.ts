import {
	GlobalThisWSS,
	type ExtendedGlobal
} from '../../../../vite-plugins/vite-plugin-svelte-socket-server';
import { wsConnectionHandler } from './ws-connection-handler';
import { dev } from '$app/environment';
import type { Session } from 'lucia';

let wssInitialized = false;

export function wssHandler(session: Session) {
	const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
	if (wssInitialized) {
		return wss;
	}

	if (typeof wss !== 'undefined') {
		// Handle zombie listeners with HMR in dev
		if (dev) {
			wss.listeners('connection').forEach((listener) => {
				if (listener.name === 'onConnection') {
					wss.removeListener('connection', listener);
				}
			});
		}
		wss.on('connection', async function onConnection(ws, req) {
			return await wsConnectionHandler(session, ws, req);
		});
		wssInitialized = true;
	}
	return wss;
}
