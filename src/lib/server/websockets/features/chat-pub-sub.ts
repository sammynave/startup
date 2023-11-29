import { client, create } from '../redis-client';
import { WebSocket } from 'ws';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';

export class ChatPubSub {
	ws: ExtendedWebSocket;
	wss: ExtendedWebSocketServer;
	channel: string;
	redisClient: Redis;
	sub: Redis;
	username: string;

	private constructor({
		ws,
		wss,
		channel,
		sub,
		redisClient,
		username
	}: {
		ws: ExtendedWebSocket;
		wss: ExtendedWebSocketServer;
		channel: string;
		sub: Redis;
		redisClient: Redis;
		username: string;
	}) {
		this.ws = ws;
		this.wss = wss;
		this.channel = channel;
		this.sub = sub;
		this.redisClient = redisClient;
		this.username = username;
	}

	static async init({
		ws,
		wss,
		channel,
		username
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		ws: ExtendedWebSocket;
		username: string;
	}) {
		const redisClient = client();
		const sub = create();

		const chat = new ChatPubSub({ ws, wss, channel, sub, redisClient, username });

		await sub.subscribe(chat.channel, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});
		const subscription = await sub.on('message', (channel, message) => {
			if (channel === chat.channel) {
				chat.notify(message);
			}
		});

		await chat.connected(username);

		ws.on('message', async (data: string) => {
			const { message } = JSON.parse(data);
			await chat.received({ username, message });
		});
		ws.on('close', async () => {
			await chat.disconnected(username);
			subscription.unsubscribe();
		});

		return chat;
	}

	private notify(message: string) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message, { binary: false });
		}
	}

	async connected(username: string) {
		const message = JSON.stringify({
			type: 'connect',
			channel: this.channel,
			message: `${username} joined`
		});
		await this.redisClient.publish(this.channel, message);
	}

	async disconnected(username: string) {
		const message = JSON.stringify({
			type: 'disconnect',
			channel: this.channel,
			message: `${username} left`
		});
		await this.redisClient.publish(this.channel, message);
	}

	async received({ username, message }: { username: string; message: string }) {
		const chatMessage = JSON.stringify({
			type: 'message',
			channel: this.channel,
			username,
			message
		});
		await this.redisClient.lpush(this.channel, chatMessage);
		await this.redisClient.publish(this.channel, chatMessage);
	}
}
