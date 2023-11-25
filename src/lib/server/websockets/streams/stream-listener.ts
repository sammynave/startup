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
		if (this.clients.length === 0) {
			this.listening = false;
		}
	}

	// TODO: Document what's going on here
	getStreams() {
		const streamNames = new Set();
		const lastSeenIds: string[] = [];
		return [...this.streamArgs.values()]
			.reduce(
				(acc, [streamName, lastSeenId]) => {
					// use a set for stream names since they should not be duplicated
					if (acc[0].has(streamName)) {
						return acc;
					} else {
						acc[0].add(streamName);
						// Because of the special `$` symbol for stream ID,
						// this needs to be an array so we can have duplicates.
						// These args need to be balanced, meaning if there are two
						// streams there should be two IDs
						acc[1].push(lastSeenId);
					}
					return acc;
				},
				[streamNames, lastSeenIds]
			)
			.map((set: typeof streamNames | typeof lastSeenIds) => [...set])
			.flat();
	}

	async *readStream() {
		while (this.listening) {
			try {
				yield await streamsSubClient().xread('BLOCK', 4000, 'STREAMS', ...this.getStreams());
			} catch (err) {
				console.error(err);
			}
		}
	}

	async listenForMessages() {
		for await (const results of this.readStream()) {
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
		}
	}
}

// This needs to be a singleton to prevent duplicates
const listener = new Listener();
// listener.listenForMessages();

export { listener };
