import { WebSocket } from 'ws';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';

export function reloadAllClients(wss: ExtendedWebSocketServer) {
	return function (stream: string) {
		wss.clients.forEach((client: ExtendedWebSocket) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify({ type: 'reload', stream }), {
					binary: false
				});
			}
		});
	};
}
