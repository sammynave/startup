import WebSocket from 'ws';
import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../utils.js';
import type { IncomingMessage } from 'http';
import { Presence } from './presence.js';
import { Chat } from './chat.js';
import { auth } from '$lib/server/lucia';

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

function channelFrom(request: IncomingMessage) {
	const url = new URL(`${request.headers.origin}${request.url}`);
	return url.searchParams.get('channel');
}

async function sessionFrom(request: IncomingMessage) {
	const sessionId = auth.readSessionCookie(request.headers.cookie);
	return sessionId ? await auth.validateSession(sessionId) : null; // note: `validateSession()` throws an error if session is invalid
}

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

		const chat = await Chat.init({ wss, channel });
		const presence = await Presence.init({ wss, channel });

		await presence.add(session.user.username);
		await chat.connected(session.user.username);

		ws.on('message', async (data: string) => {
			const { message } = JSON.parse(data);
			await chat.received({ username: session.user.username, message });
		});
		ws.on('close', async () => {
			await chat.disconnected(session.user.username);
			await presence.remove(session.user.username);
		});
	};
