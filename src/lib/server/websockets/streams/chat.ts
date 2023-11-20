import type { Redis } from 'ioredis';
import { streamsClient, streamsSubClient } from '../redis-client';
import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../utils.js';
import { WebSocket } from 'ws';

export function redisKey(channel: string) {
	return `chat_messages:streams:${channel}`;
}

export class Chat {
	wss: ExtendedWebSocketServer;
	channel: string;
	redisChannel: string;
	redisClient: Redis;
	sub: Redis;
	username: string;

	private constructor({
		wss,
		channel,
		sub,
		redisClient,
		username
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		sub: Redis;
		redisClient: Redis;
		username: string;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.redisChannel = redisKey(channel);
		this.sub = sub;
		this.redisClient = redisClient;
		this.username = username;
	}

	static async init({
		wss,
		channel,
		username
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		username: string;
	}) {
		const redisClient = streamsClient();
		const sub = streamsSubClient();
		const chat = new Chat({ wss, channel, sub, redisClient, username });

		return chat;
	}

	client() {
		let myClient: ExtendedWebSocket | null = null;
		this.wss.clients.forEach((client) => {
			if (
				client.readyState === WebSocket.OPEN &&
				client.channel === this.channel &&
				this.username === client.session.user.username
			) {
				myClient = client;
			}
		});
		return myClient;
	}

	async notify() {
		const client = this.client() as ExtendedWebSocket | null;
		if (client) {
			const lastSeenId = await this.redisClient.hget(
				`users:${client.session.user.username}`,
				this.redisChannel
			);
			// prefix `chat.lastSeenId` with `(`, this makes the range exclusive. default is inclusive
			const id = lastSeenId ? `(${lastSeenId}` : '-';
			const results = await this.redisClient.xrange(this.redisChannel, id, '+');
			if (results.length) {
				results.forEach(async ([id, [, type]]) => {
					const message = await this.redisClient.hgetall(`${type}:${id}`);
					client.send(JSON.stringify(message), { binary: false });
				});
				const lastId = results[results.length - 1][0];
				await this.redisClient.hset(
					`users:${client.session.user.username}`,
					this.redisChannel,
					lastId
				);
			}
		}
	}

	async connected(username: string) {
		// const id = await this.redisClient.xadd(this.redisChannel, '*', 'type', 'connected');
		// await this.redisClient.hset(`connected:${id}`, {
		// 	type: 'connect',
		// 	channel: this.channel,
		// 	message: `${username} connected`
		// });
	}

	async disconnected(username: string) {
		// const message = JSON.stringify({
		// 	type: 'disconnect',
		// 	channel: this.channel,
		// 	message: `${username} disconnected`
		// });
		// await this.pub.publish(this.redisChannel, message);
	}

	async received({ username, message }: { username: string; message: string }) {
		// xadd inserts message id into stream
		const id = await this.redisClient.xadd(this.redisChannel, '*', 'type', 'message');
		await this.redisClient.hset(`message:${id}`, {
			id,
			type: 'message',
			channel: this.channel,
			username,
			message
		});
	}
}
