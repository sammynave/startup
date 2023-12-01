import type { Redis } from 'ioredis';
import { client } from '../../redis-client';
import { listener } from '../../stream-listener.js';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { WebSocket } from 'ws';

export class Chat {
	stream: string;
	private ws: ExtendedWebSocket;
	private username: string;
	private redisClient: Redis = client();

	/*
	 This is the preferred way to instantiate this class for 2 reasons:
	  1. If we use the class in multiple places, we want to avoid duplicating all of this setup.
	 	2. Constructors can not be asynchronous so the only way to encapsulate the setup is through
		   a static method
	*/
	static async init({ ws, stream }: { ws: ExtendedWebSocket; stream: string }) {
		const chat = new Chat({ ws, stream });

		// Register this chat instance with the redis stream listener
		listener.addClient(chat);

		// Let everyone know that this user joined the chat
		await chat.connect();

		// Listen for messages from the user of this socket
		ws.on('message', async (data: string) => await chat.receive(JSON.parse(data).message));

		// Let everyone know that this user has left the chat
		ws.on('close', async () => {
			listener.removeClient(chat);
			await chat.disconnect();
		});

		return chat;
	}

	async notify() {
		if (this.ws.readyState === WebSocket.OPEN) {
			const lastSeenId = await this.getLastSeenId();

			// the default behavior is inclusive to the `lastSeenId`, since we've already
			// seen it, we want to make this range exclusive. we can do that by
			// prefixing `lastSeenId` with `(`.
			const beginningId = lastSeenId ? `(${lastSeenId}` : '-';
			const messages = await this.redisClient.xrange(this.stream, beginningId, '+');

			messages.forEach(async ([id, [, type]]) => {
				const message = await this.redisClient.hgetall(`${type}:${id}`);
				this.ws.send(JSON.stringify(message), { binary: false });
			});

			if (messages.length) {
				const id = messages[messages.length - 1][0];
				await this.setLastSeenId(id);
			}
		}
	}

	private constructor({ stream, ws }: { stream: string; ws: ExtendedWebSocket }) {
		this.stream = stream;
		this.ws = ws;
		this.username = ws.session.user.username;
	}

	private async getLastSeenId() {
		return await this.redisClient.hget(`users:${this.username}`, this.stream);
	}

	private async setLastSeenId(id: string) {
		return await this.redisClient.hset(`users:${this.username}`, this.stream, id);
	}

	private async addToStream() {
		return await this.redisClient.xadd(this.stream, '*', 'type', 'message');
	}

	private async connect() {
		const id = await this.addToStream();
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'connect',
			stream: this.stream,
			message: `${this.username} joined`
		});

		// Send down any unseen messages that may have happened
		// between page load and instantiation
		await this.notify();
	}

	private async disconnect() {
		const id = await this.addToStream();
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'disconnect',
			stream: this.stream,
			message: `${this.username} left`
		});
	}

	private async receive(message: string) {
		const id = await this.addToStream();
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'message',
			stream: this.stream,
			username: this.username,
			message
		});
	}
}
