import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../vite-plugins/vite-plugin-svelte-socket-server';
import type { IncomingMessage } from 'http';
import { streamFrom } from './request-utils';
import type { Session } from 'lucia';
import { Presence } from './handlers/presence';
import { Chat } from './handlers/chat';

const handlers = {
	chat: Chat,
	presence: Presence
};

const handlerFor = (type: keyof typeof handlers) => handlers[type];

export const wsConnectionHandler =
	(wss: ExtendedWebSocketServer, session: Session) =>
	async (ws: ExtendedWebSocket, request: IncomingMessage) => {
		const url = new URL(`${request.headers.origin}${request.url}`);
		const clients = url.searchParams.getAll('clients').map((client) => JSON.parse(client));

		if (clients.length === 0) {
			ws.close(1008, 'No clients specified');
			return;
		}

		const initializedClients: Array<Chat | Presence> = await Promise.all(
			clients.map(async ({ type, stream, strategy = 'pub-sub' }) => {
				if (!strategy) {
					console.warn(`No strategy specified for client ${type}. Defaulting to pub-sub`);
				}

				if (!stream) {
					console.error(`Can not initialize client ${type}, no stream specified.`);
					return;
				}
				return await handlerFor(type).init({
					stream,
					strategy,
					ws,
					wss,
					username: session.user.username
				});
			})
		);

		initializedClients.forEach(async (client) => {
			const c = await client;
			await c.connected();
		});

		ws.on('message', async (data: string) => {
			const parsed = JSON.parse(data);
			initializedClients.forEach(async (client) => {
				await client.receiveMessage({ username: session.user.username, message: parsed });
			});
		});

		ws.on('close', async () => {
			initializedClients.forEach(async (client) => {
				await client.disconnected();
			});
		});
	};
