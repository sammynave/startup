import type { ExtendedWebSocketServer } from './utils';
import { WebSocket } from 'ws';

export function reloadAllClients(wss: ExtendedWebSocketServer) {
	return function (channel: string) {
		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify({ type: 'reload', channel }), {
					binary: false
				});
			}
		});
	};
}
