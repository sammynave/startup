import { streamsSubClient } from '../redis-client';
import { redisKey, type Chat, redisPresenceKey } from './chat';
import type { Presence } from './presence';

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
			// TODO: write a function to get the streams when a client is added
			// make add/remove clients generic
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

export { listener };
