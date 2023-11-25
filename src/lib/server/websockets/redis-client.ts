import Redis from 'ioredis';
import { REDIS_WS_SERVER } from '$env/static/private';
import type { RedisStreams as RedisStreamsChat } from './handlers/strategies/chat/redis-streams';

let pub: Redis | null = null;
let sub: Redis | null = null;
let cli: Redis | null = null;
let streams: Redis | null = null;
let streamsSub: Redis | null = null;

export const pubClient = () => {
	pub = pub ? pub : new Redis(REDIS_WS_SERVER);
	return pub;
};

export const subClient = () => {
	sub = sub ? sub : new Redis(REDIS_WS_SERVER);
	return sub;
};

export const client = () => {
	cli = cli ? cli : new Redis(REDIS_WS_SERVER);
	return cli;
};

export const streamsClient = () => {
	streams = streams ? streams : new Redis(REDIS_WS_SERVER);
	return streams;
};

export const streamsSubClient = () => {
	streamsSub = streamsSub ? streamsSub : new Redis(REDIS_WS_SERVER);
	return streamsSub;
};

class Listener {
	clients: RedisStreamsChat[] = [];
	streamArgs = new Map();
	listening = false;

	addClient(client: RedisStreamsChat) {
		console.log('adding');
		this.clients.push(client);
		this.streamArgs.set(client, [client.stream, '$']);

		// ensure we only have one listener
		if (this.listening === false) {
			this.listening = true;
			this.listenForMessages();
		}
	}

	removeClient(client: RedisStreamsChat) {
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
						if (stream === client.stream) {
							client.broadcast();
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
listener.listenForMessages();

export { listener };
