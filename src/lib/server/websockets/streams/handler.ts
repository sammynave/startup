import WebSocket from 'ws';
import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../utils.js';
import type { IncomingMessage } from 'http';
import { Presence } from './presence';
import { Chat, redisKey, redisPresenceKey } from './chat.js';
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
	chatClients: Chat[] = [];
	presenceClients: Presence[] = [];

	addChatClient(client: Chat) {
		this.chatClients.push(client);
	}
	removeChatClient(client: Chat) {
		this.chatClients = this.chatClients.filter((c) => c !== client);
	}
	addPresenceClient(client: Presence) {
		this.presenceClients.push(client);
	}
	removePresenceClient(client: Presence) {
		this.presenceClients = this.presenceClients.filter((c) => c !== client);
	}
	// Is this safe? Will this blow the stack at some point?
	async listenForMessages(lastSeenChatId: string = '$', lastSeenPresenceId: string = '$') {
		try {
			const results = await streamsSubClient().xread(
				'BLOCK',
				0,
				'STREAMS',
				redisKey('streams-chat'),
				redisPresenceKey('streams-chat'),
				lastSeenChatId,
				lastSeenPresenceId
			);

			if (results?.length) {
				results.forEach(([stream, [[id]]]) => {
					if (stream === redisPresenceKey('streams-chat')) {
						this.presenceClients.forEach((client) => client.notify());
						lastSeenPresenceId = id;
					}

					if (stream === redisKey('streams-chat')) {
						this.chatClients.forEach((client) => client.notify());
						lastSeenChatId = id;
					}
				});
			}
			await this.listenForMessages(lastSeenChatId, lastSeenPresenceId);
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
		await listener.addChatClient(chat);

		const presence = await Presence.init({ wss, channel, username: session.user.username });
		await listener.addPresenceClient(presence);

		await presence.add(session.user.username);
		await chat.connected(session.user.username);

		ws.on('message', async (data: string) => {
			const parsed = JSON.parse(data);
			await chat.received({ username: session.user.username, message: parsed.message });
		});
		ws.on('close', async () => {
			await listener.removeChatClient(chat);
			await listener.removePresenceClient(presence);
			await chat.disconnected(session.user.username);
			await presence.remove(session.user.username);
		});
	};
