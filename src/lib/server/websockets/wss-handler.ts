import type { Session } from 'lucia';
import { getWss } from '../../../../vite-plugins/vite-plugin-svelte-socket-server';
import { wsConnectionHandler } from './ws-connection-handler';

let wssInitialized = false;
export function wssHandler(session: Session) {
	if (wssInitialized) {
		return;
	}
	const wss = getWss();
	// Handle weirdness with HMR
	// TODO: only do this in dev?
	if (wssInitialized === false && typeof wss !== 'undefined') {
		wss.removeAllListeners();
		wss.clients.clear();
	}

	if (typeof wss !== 'undefined') {
		wss.on('connection', wsConnectionHandler(wss, session));
		wssInitialized = true;
	}
	return wss;
}
