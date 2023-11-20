import type { Redis } from 'ioredis';
import { client, pubClient, subClient } from '../redis-client';
import type { ExtendedWebSocketServer } from '../utils';
import { WebSocket } from 'ws';

export function pubSubKey(channel: string) {
	return `chat_messages:pubsub:${channel}`;
}

export class Chat {
	wss: ExtendedWebSocketServer;
	channel: string;
	redisChannel: string;
	redisClient: Redis;
	sub: Redis;
	pub: Redis;

	private constructor({
		wss,
		channel,
		pub,
		sub,
		redisClient
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		pub: Redis;
		sub: Redis;
		redisClient: Redis;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.redisChannel = pubSubKey(channel);
		this.sub = sub;
		this.pub = pub;
		this.redisClient = redisClient;
	}

	static async init({ wss, channel }: { wss: ExtendedWebSocketServer; channel: string }) {
		const redisClient = client();
		const pub = pubClient();
		const sub = subClient();

		const chat = new Chat({ wss, channel, pub, sub, redisClient });

		const currentSubscriptions = await pub.pubsub('CHANNELS');

		if (!currentSubscriptions.includes(chat.redisChannel)) {
			// Don't over subscribe.
			// WARNING: any changes to this block will not get picked up during HMR.
			// restart server (or remove `if` statement)
			// NOTE if you remove the `if` then you will have multiple subscribers and you will get duplicate socket messages)
			sub.subscribe(chat.redisChannel, (err) => {
				if (err) {
					console.error('Failed to subscribe: %s', err.message);
				}
			});
			sub.on('message', (redisChannel, message) => {
				if (redisChannel === chat.redisChannel) {
					chat.notifyClients(message);
				}
			});
		}

		return chat;
	}

	private notifyClients(message: string) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && client.channel === this.channel) {
				client.send(message, { binary: false });
			}
		});
	}

	private notifySelf(message: string, sessionId: string) {
		this.wss.clients.forEach((client) => {
			if (
				client.readyState === WebSocket.OPEN &&
				sessionId === client.session.sessionId &&
				client.channel === this.channel
			) {
				client.send(message, { binary: false });
			}
		});
	}

	async connected(username: string) {
		const message = JSON.stringify({
			type: 'connect',
			channel: this.channel,
			message: `${username} connected`
		});
		await this.pub.publish(this.redisChannel, message);
	}

	async disconnected(username: string) {
		const message = JSON.stringify({
			type: 'disconnect',
			channel: this.channel,
			message: `${username} disconnected`
		});
		await this.pub.publish(this.redisChannel, message);
	}

	async received({ username, message }: { username: string; message: string }) {
		const chatMessage = JSON.stringify({
			type: 'message',
			channel: this.channel,
			username,
			message
		});
		await this.redisClient.lpush(this.redisChannel, chatMessage);
		await this.pub.publish(this.redisChannel, chatMessage);
	}
}
