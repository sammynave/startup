import type { Redis } from 'ioredis';
import { create } from './redis-client';

type Client = {
	stream: string;
	notify: () => void;
};
type Clients = Set<Client>;
type StreamName = string;
type LastSeenId = string;
type StreamArgs = Map<Client, [StreamName, LastSeenId]>;

class StreamReader {
	redisClient: Redis = create();
	clients: Clients = new Set();
	streamArgs: StreamArgs = new Map();
	listening = true;

	constructor(clients: Clients, streamArgs: StreamArgs) {
		this.clients = clients;
		this.streamArgs = streamArgs;
	}

	update(clients: Clients, streamArgs: StreamArgs) {
		this.clients = clients;
		this.streamArgs = streamArgs;
	}

	stop() {
		this.clients = new Set();
		this.streamArgs = new Map();
		this.listening = false;
	}

	async listenForMessages() {
		for await (const results of this.readStream()) {
			try {
				if (results?.length && this.listening) {
					results.forEach(async ([stream, [[id]]]) => {
						this.clients.forEach(async (client) => {
							if (stream === client.stream && this.listening) {
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

	/*
		NOTE: These args returned from this method need to be balanced,
		meaning if there are two streams there should be two IDs

		@return [
			'presence:streams:streams-chat',
  		'chat_messages:streams:streams-chat',
  		'1701377504479-0', // this is the id for 'presence:streams:streams-chat'
  		'$'                // this is the id for 'chat_messages:streams:streams-chat'
		]
	*/
	private buildStreamIds() {
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
						/*
							Because of the special `$` symbol for stream ID,
						  this needs to be an array so we can support duplicates across streams.

							For example, if there have been no messages in the Presence stream addClient
							no messages in the Chat stream, we need the final value to be:
							['presence:stream', 'chat:stream', '$', '$']
						*/
						acc[1].push(lastSeenId);
					}
					return acc;
				},
				[streamNames, lastSeenIds] as [typeof streamNames, typeof lastSeenIds]
			)
			.map((set: typeof streamNames | typeof lastSeenIds) => [...set])
			.flat();
	}

	private *readStream() {
		while (true) {
			if (this.listening) {
				try {
					yield this.redisClient.xread('BLOCK', 3000, 'STREAMS', ...this.buildStreamIds());
				} catch (err) {
					console.error(err);
					break;
				}
			} else {
				return;
			}
		}
	}
}

class StreamListener {
	reader: StreamReader | null = null;
	clients: Clients = new Set();
	streamArgs: StreamArgs = new Map();
	listening = false;

	addClient(client: Client) {
		this.clients.add(client);
		this.streamArgs.set(client, [client.stream, '$']);

		// ensure we only have one reader
		if (this.listening === false) {
			this.listening = true;
			this.reader = new StreamReader(this.clients, this.streamArgs);
			this.reader.listenForMessages();
		} else {
			this.reader?.update(this.clients, this.streamArgs);
		}
	}

	removeClient(client: Client) {
		this.clients.delete(client);
		this.streamArgs.delete(client);

		// Stop listening if there are no clients.
		if (this.clients.size === 0) {
			this.listening = false;
			this.reader?.stop();

			// unset reader so GC can clean up
			this.reader = null;
		} else {
			this.reader?.update(this.clients, this.streamArgs);
		}
	}
}

// This needs to be a singleton to prevent duplicates
const listener = new StreamListener();

export { listener };
