import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../setup.js';
import type { IncomingMessage } from 'http';
import { Presence } from './presence';
import { Chat } from './chat.js';
import { listener } from './stream-listener.js';
import { channelFrom, sessionFrom } from '../request-utils.js';

export const connectionHandler =
	(wss: ExtendedWebSocketServer) => async (ws: ExtendedWebSocket, request: IncomingMessage) => {
		const channel = channelFrom(request);
		if (channel === null) {
			ws.close(1008, 'No channel specified');
			return;
		}

		const session = await sessionFrom(request);

		if (session) {
			ws.session = session;
			ws.channel = channel;
		} else {
			ws.close(1008, 'User not authenticated');
			return;
		}

		const chat = await Chat.init({ wss, channel, username: session.user.username });
		await listener.addClient(chat);

		const presence = await Presence.init({ wss, channel, username: session.user.username });
		await listener.addClient(presence);

		await presence.add(session.user.username);
		await chat.connected(session.user.username);

		ws.on('message', async (data: string) => {
			const parsed = JSON.parse(data);
			await chat.received({ username: session.user.username, message: parsed.message });
		});
		ws.on('close', async () => {
			listener.removeClient(chat);
			listener.removeClient(presence);
			await chat.disconnected(session.user.username);
			await presence.remove(session.user.username);
		});
	};
