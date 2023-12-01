import type { Redis } from 'ioredis';
import { client } from '../../redis-client.js';
import { listener } from '../../stream-listener.js';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';
import { WebSocket } from 'ws';

export class Presence {
	stream: string;
	private redisClient: Redis = client();
	private ws: ExtendedWebSocket;
	private username: string;

	static async init({ ws, stream }: { ws: ExtendedWebSocket; stream: string }) {
		const presence = new Presence({ ws, stream });
		listener.addClient(presence);
		await presence.addUser();

		ws.on('close', async () => {
			listener.removeClient(presence);
			await presence.removeUser();
		});

		return presence;
	}

	async notify() {
		if (this.ws.readyState === WebSocket.OPEN) {
			const users = await this.presentUsers();
			this.ws.send(JSON.stringify({ type: 'presence', message: users, stream: this.stream }));
		}
	}

	private constructor({ stream, ws }: { stream: string; ws: ExtendedWebSocket }) {
		this.stream = stream;
		this.ws = ws;
		this.username = ws.session.user.username;
	}

	private async presentUsers() {
		// return all entries in zrange sorted by oldest first
		const results = await this.redisClient.zrange(
			`set:${this.stream}`,
			-Infinity,
			+Infinity,
			'BYSCORE'
		);
		return results;
	}

	private async broadcast() {
		await this.redisClient.xadd(this.stream, '*', 'type', 'presence');
	}

	private async addUser() {
		// Insert username at current timestamp in zrange
		await this.redisClient.zadd(`set:${this.stream}`, Date.now(), this.username);
		await this.notify();
		await this.broadcast();
	}

	private async removeUser() {
		await this.redisClient.zrem(`set:${this.stream}`, this.username);
		await this.broadcast();
	}
}
