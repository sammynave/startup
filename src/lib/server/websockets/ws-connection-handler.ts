import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../vite-plugins/vite-plugin-svelte-socket-server';
import type { IncomingMessage } from 'http';
import { streamFrom } from './request-utils';
import type { Session } from 'lucia';

const Handlers = {
	chat: ChatHandler,
	presence: PresenceHandler
};

export const wsConnectionHandler =
	(wss: ExtendedWebSocketServer, session: Session) =>
	async (ws: ExtendedWebSocket, request: IncomingMessage) => {
		const url = new URL(`${request.headers.origin}${request.url}`);
		const clients = url.searchParams.getAll('clients').map((client) => JSON.parse(client));

		if (clients.length === 0) {
			ws.close(1008, 'No clients specified');
			return;
		}

		clients.forEach(({ name, stream, strategy = 'pub-sub' }) => {
			if (!strategy) {
				console.warn(`No strategy specified for client ${name}. Defaulting to pub-sub`);
			}

			if (!stream) {
				console.error(`Can not initialize client ${name}, no stream specified.`);
				return;
			}

			Handlers[name].init({ stream, strategy, ws, wss });
		});
	};
