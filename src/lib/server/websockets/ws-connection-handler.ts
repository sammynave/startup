import {
	GlobalThisWSS,
	type ExtendedWebSocket,
	type ExtendedWebSocketServer,
	type ExtendedGlobal
} from '../../../../vite-plugins/vite-plugin-svelte-socket-server';
import type { IncomingMessage } from 'http';
import { streamFrom } from './request-utils';
import type { Session } from 'lucia';
import { Presence } from './handlers/presence';
import { Chat } from './handlers/chat';
import { listener } from './redis-client';

const handlers = {
	chat: Chat,
	presence: Presence
};

const handlerFor = (type: keyof typeof handlers) => handlers[type];

export const wsConnectionHandler = async (
	session: Session,
	ws: ExtendedWebSocket,
	request: IncomingMessage
) => {
	console.log(`[wss:kit] client connected (${ws.socketId})`);
	const url = new URL(`${request.headers.origin}${request.url}`);
	const clients = url.searchParams.getAll('clients').map((client) => JSON.parse(client));

	if (clients.length === 0) {
		ws.close(1008, 'No clients specified');
		return;
	}
	const username = session.user.username;
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
				username
			});
		})
	);

	initializedClients.forEach(async (client) => {
		const c = await client;
		await c.connected(username);
	});

	ws.on('message', async (message: string) => {
		initializedClients.forEach(async (client) => {
			await client.receiveMessage({ username, message });
		});
	});

	ws.on('close', async () => {
		initializedClients.forEach(async (client) => {
			await client.disconnected(username);
		});
	});
};
