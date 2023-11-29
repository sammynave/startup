import type { Redis } from 'ioredis';
import { client } from '../redis-client.js';
import { listener } from '../stream-listener.js';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';
import { WebSocket } from 'ws';

export class PresenceStreams {
	wss: ExtendedWebSocketServer;
	channel: string;
	redisClient: Redis = client();
	username: string;
	ws: ExtendedWebSocket;

	private constructor({
		wss,
		channel,
		username,
		ws
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		username: string;
		ws: ExtendedWebSocket;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.username = username;
		this.ws = ws;
	}

	static async init({
		ws,
		wss,
		channel,
		username
	}: {
		ws: ExtendedWebSocket;
		wss: ExtendedWebSocketServer;
		channel: string;
		username: string;
	}) {
		const presence = new PresenceStreams({ ws, wss, channel, username });
		await listener.addClient(presence);
		await presence.connected(username);
		ws.on('close', async () => {
			await presence.disconnected(username);
			listener.removeClient(presence);
		});
		await presence.notify();
		return presence;
	}

	async notify() {
		const client = this.ws as ExtendedWebSocket | null;
		if (client && client.readyState === WebSocket.OPEN) {
			const users = await this.presentUsers();
			client.send(JSON.stringify({ type: 'presence', message: users, channel: this.channel }));
		}
	}

	async presentUsers() {
		// return all entries in zrange sorted by oldest first
		const results = await this.redisClient.zrange(
			`set:${this.channel}`,
			-Infinity,
			+Infinity,
			'BYSCORE'
		);
		return results;
	}

	async connected(username: string) {
		// Insert username at current timestamp in zrange
		await this.redisClient.zadd(`set:${this.channel}`, Date.now(), username);
		await this.broadcast();
	}

	async disconnected(username: string) {
		await this.redisClient.zrem(`set:${this.channel}`, username);
		await this.broadcast();
	}

	async broadcast() {
		await this.redisClient.xadd(this.channel, '*', 'type', 'presence');
	}
}
