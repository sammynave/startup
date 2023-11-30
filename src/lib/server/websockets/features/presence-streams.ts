import type { Redis } from 'ioredis';
import { client } from '../redis-client.js';
import { listener } from '../stream-listener.js';
import type { ExtendedWebSocket } from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';
import { WebSocket } from 'ws';

export class PresenceStreams {
	channel: string;
	private redisClient: Redis = client();
	private ws: ExtendedWebSocket;

	static async init({ ws, channel }: { ws: ExtendedWebSocket; channel: string }) {
		const presence = new PresenceStreams({ ws, channel });
		await listener.addClient(presence);

		ws.on('close', async () => {
			await presence.disconnected();
			listener.removeClient(presence);
		});

		await presence.connected();
		return presence;
	}

	async notify() {
		const client = this.ws as ExtendedWebSocket | null;
		if (client && client.readyState === WebSocket.OPEN) {
			const users = await this.presentUsers();
			client.send(JSON.stringify({ type: 'presence', message: users, channel: this.channel }));
		}
	}

	private constructor({ channel, ws }: { channel: string; ws: ExtendedWebSocket }) {
		this.channel = channel;
		this.ws = ws;
	}

	private async presentUsers() {
		// return all entries in zrange sorted by oldest first
		const results = await this.redisClient.zrange(
			`set:${this.channel}`,
			-Infinity,
			+Infinity,
			'BYSCORE'
		);
		return results;
	}

	private async connected() {
		// Insert username at current timestamp in zrange
		await this.redisClient.zadd(`set:${this.channel}`, Date.now(), this.ws.session.user.username);
		await this.notify();
		await this.broadcast();
	}

	private async disconnected() {
		await this.redisClient.zrem(`set:${this.channel}`, this.ws.session.user.username);
		await this.broadcast();
	}

	private async broadcast() {
		await this.redisClient.xadd(this.channel, '*', 'type', 'presence');
	}
}
