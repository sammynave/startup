import type { Redis } from 'ioredis';
import { client } from '../redis-client';
import { listener } from '../stream-listener.js';
import type { ExtendedWebSocket } from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';

export class ChatStreams {
	channel: string;
	username: string;
	ws: ExtendedWebSocket;
	redisClient: Redis = client();
	id: string = nanoid();

	private constructor({
		channel,
		username,
		ws
	}: {
		channel: string;
		username: string;
		ws: ExtendedWebSocket;
	}) {
		this.channel = channel;
		this.username = username;
		this.ws = ws;
	}

	/*
	 This is the preferred way to instantiate this class for 2 reasons:
	  1. If we use the class in multiple places, we want to avoid duplicating all of this setup.
	 	2. Constructors can not be asynchronous so the only way to encapsulate the setup is through
		   a static method
	*/
	static async init({
		ws,
		channel,
		username
	}: {
		ws: ExtendedWebSocket;
		channel: string;
		username: string;
	}) {
		const chat = new ChatStreams({
			ws,
			channel,
			username
		});

		// Register this chat instance with the redis stream listener
		await listener.addClient(chat);

		// Send down any unseen messages that may have happened
		// between page load and instantiation
		await chat.notify();

		// Let everyone know that this user joined the chat
		await chat.connected(chat.username);

		// Listen for messages from the user of this socket
		ws.on('message', async (data: string) => {
			const parsed = JSON.parse(data);
			await chat.received({ username, message: parsed.message });
		});

		// Let everyone know that this user has left the chat
		ws.on('close', async () => {
			await chat.disconnected(username);
		});

		return chat;
	}

	async getLastSeenId() {
		return await this.redisClient.hget(`users:${this.username}`, this.channel);
	}

	async setLastSeenId(id: string) {
		return await this.redisClient.hset(`users:${this.username}`, this.channel, id);
	}

	async notify() {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			const lastSeenId = await this.getLastSeenId();

			// the default behavior is inclusive to the `lastSeenId`, since we've already
			// seen it, we want to make this range exclusive. we can do that by
			// prefixing `lastSeenId` with `(`.
			const beginningId = lastSeenId ? `(${lastSeenId}` : '-';
			const messages = await this.redisClient.xrange(this.channel, beginningId, '+');

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

	async connected(username: string) {
		const id = await this.redisClient.xadd(this.channel, '*', 'type', 'message');
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'connect',
			channel: this.channel,
			message: `${username} joined`
		});
	}

	async disconnected(username: string) {
		await listener.removeClient(this);
		const id = await this.redisClient.xadd(this.channel, '*', 'type', 'message');
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'disconnect',
			channel: this.channel,
			message: `${username} left`
		});
	}

	async received({ username, message }: { username: string; message: string }) {
		// xadd inserts message id into stream
		const id = await this.redisClient.xadd(this.channel, '*', 'type', 'message');
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'message',
			channel: this.channel,
			username,
			message
		});
	}
}
