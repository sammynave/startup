import type { Redis } from 'ioredis';
import { create } from './redis-client';
import type { ChatStreams } from './features/chat-streams';
import type { PresenceStreams } from './features/presence-streams';

// This can be more generic.
// A client can be any object with a `notify` method and `channel` member
type Clients = Set<ChatStreams | PresenceStreams>;

type StreamName = string;
type LastSeenId = string;
type StreamArgs = Map<ChatStreams | PresenceStreams, [StreamName, LastSeenId]>;

class StreamReader {
	redisClient: Redis = create();
	clients: Clients = new Set();
	streamArgs: StreamArgs = new Map();
	listening = true;

	constructor(clients: Clients, streamArgs: StreamArgs) {
		this.clients = clients;
		this.streamArgs = streamArgs;
	}

	set(clients: Clients, streamArgs: StreamArgs) {
		this.clients = clients;
		this.streamArgs = streamArgs;
	}

	stop() {
		this.clients = new Set();
		this.streamArgs = new Map();
		this.listening = false;
	}

	getStreams() {
		const streamNames: Set<StreamName> = new Set();
		const lastSeenIds: LastSeenId[] = [];
		return [...this.streamArgs.values()]
			.reduce(
				(acc, [streamName, lastSeenId]) => {
					// Use a Set for stream names.
					// There should be no duplicates
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
				[streamNames, lastSeenIds] as [typeof streamNames, typeof lastSeenIds]
			)
			.map((set: typeof streamNames | typeof lastSeenIds) => [...set])
			.flat();
	}

	*readStream() {
		while (true) {
			if (this.listening) {
				try {
					yield this.redisClient.xread('BLOCK', 3000, 'STREAMS', ...this.getStreams());
				} catch (err) {
					console.error(err);
					break;
				}
			} else {
				return;
			}
		}
	}

	async listenForMessages() {
		for await (const results of this.readStream()) {
			try {
				if (results?.length && this.listening) {
					results.forEach(async ([stream, [[id]]]) => {
						this.clients.forEach(async (client) => {
							if (stream === client.channel && this.listening) {
								const [streamName] = this.streamArgs.get(client) as [string, string];
								this.streamArgs.set(client, [streamName, id]);
								await client.notify();
							}
						});
					});
				}

				if (!this.listening) {
					break;
				}
			} catch (e) {
				console.log({ e });
				break;
			}
		}
	}
}

class StreamListener {
	reader: StreamReader | null = null;
	clients: Clients = new Set();
	streamArgs: StreamArgs = new Map();
	listening = false;

	addClient(client: ChatStreams | PresenceStreams) {
		this.clients.add(client);
		this.streamArgs.set(client, [client.channel, '$']);

		// ensure we only have one reader
		if (this.listening === false) {
			this.listening = true;
			this.reader = new StreamReader(this.clients, this.streamArgs);
			this.reader.listenForMessages();
		} else {
			this.reader?.set(this.clients, this.streamArgs);
		}
	}

	removeClient(client: ChatStreams | PresenceStreams) {
		this.clients.delete(client);
		this.streamArgs.delete(client);

		// Stop listening if there are no clients.
		if (this.clients.size === 0) {
			this.listening = false;
			this.reader?.stop();

			// unset reader so GC can clean up
			this.reader = null;
		} else {
			this.reader?.set(this.clients, this.streamArgs);
		}
	}
}

// This needs to be a singleton to prevent duplicates
const listener = new StreamListener();

export { listener };
