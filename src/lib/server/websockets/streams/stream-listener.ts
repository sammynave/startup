import { streamsSubClient } from '../redis-client';
import type { Chat } from './chat';
import type { Presence } from './presence';

class Listener {
	clients: (Chat | Presence)[] = [];
	streamArgs = new Map();
	listening = false;

	addClient(client: Chat | Presence) {
		this.clients.push(client);
		this.streamArgs.set(client, [client.redisChannel, '$']);

		// ensure we only have one listener
		if (this.listening === false) {
			this.listening = true;
			this.listenForMessages();
		}
	}

	removeClient(client: Chat | Presence) {
		this.clients = this.clients.filter((c) => c !== client);
		this.streamArgs.delete(client);

		// Stop listening if there are no clients.
		if (this.streamArgs.values.length === 0) {
			this.listening = false;
		}
	}

	getStreams() {
		return [...this.streamArgs.values()]
			.reduce(
				(acc, [streamName, lastSeenId]) => {
					if (acc[0].has(streamName)) {
						return acc;
					} else {
						acc[0].add(streamName);
						acc[1].push(lastSeenId);
					}
					return acc;
				},
				[new Set(), []]
			)
			.map((set) => [...set])
			.flat();
	}

	// Is this safe? Will this blow the stack at some point?
	async listenForMessages() {
		if (this.listening) {
			try {
				const streams = this.getStreams();
				const results = await streamsSubClient().xread('BLOCK', 4000, 'STREAMS', ...streams);

				if (results?.length) {
					results.forEach(([stream, [[id]]]) => {
						this.clients.forEach((client) => {
							if (stream === client.redisChannel) {
								client.notify();
								const [streamName] = this.streamArgs.get(client);
								this.streamArgs.set(client, [streamName, id]);
							}
						});
					});
				}
				await this.listenForMessages();
			} catch (err) {
				console.error(err);
			}
		}
	}
}

// This needs to be a singleton to prevent duplicates
const listener = new Listener();
listener.listenForMessages();

export { listener };
