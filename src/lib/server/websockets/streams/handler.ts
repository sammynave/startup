import WebSocket from 'ws';
import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../utils.js';
import type { IncomingMessage } from 'http';
// import { Presence } from './presence';
import { Chat, redisKey } from './chat.js';
import { streamsSubClient } from '../redis-client.js';
import { auth } from '$lib/server/lucia.js';

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

class Listener {
	clients: Chat[] = [];

	addClient(client: Chat) {
		this.clients.push(client);
	}
	removeClient(client: Chat) {
		this.clients = this.clients.filter((c) => c !== client);
	}
	// Is this safe? Will this blow the stack at some point?
	async listenForMessages(lastSeenId: string = '$') {
		try {
			const results = await streamsSubClient().xread(
				'BLOCK',
				0,
				'STREAMS',
				redisKey('streams-chat'),
				lastSeenId
			);
			if (results?.length && results?.[0]?.[1].length) {
				const [, messages] = results[0];
				this.clients.forEach((client) => client.notify());
				lastSeenId = messages[messages.length - 1][0];
			}
			await this.listenForMessages(lastSeenId);
		} catch (err) {
			console.error(err);
		}
	}
}

// This needs to be a singleton to prevent duplicates
const listener = new Listener();
listener.listenForMessages();

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
		// const presence = await Presence.init({ wss, channel });

		// await presence.add(session.user.username);
		await chat.connected(session.user.username);

		ws.on('message', async (data: string) => {
			const parsed = JSON.parse(data);
			await chat.received({ username: session.user.username, message: parsed.message });
		});
		ws.on('close', async () => {
			listener.removeClient(chat);
			await chat.disconnected(session.user.username);
			// await presence.remove(session.user.username);
		});
		listener.addClient(chat);
	};
