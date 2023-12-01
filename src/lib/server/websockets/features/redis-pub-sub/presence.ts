import type { Redis } from 'ioredis';
import { client, create } from '../../redis-client.js';
import { WebSocket } from 'ws';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';

export class Presence {
	private stream: string;
	private pub: Redis = client();
	private ws: ExtendedWebSocket;
	private username: string;

	static async init({ stream, ws }: { stream: string; ws: ExtendedWebSocket }) {
		const presence = new Presence({ ws, stream });

		// Once a Redis client calls `subscribe` it no longer responds to any
		// other commands so a new client is needed
		const subClient = create();
		await subClient.subscribe(presence.stream, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});

		const subscription = await subClient.on('message', (stream, message) => {
			if (presence.stream === stream) {
				presence.notify(JSON.parse(message));
			}
		});

		ws.on('close', async () => {
			await presence.removeUser();
			subscription.unsubscribe();
		});

		await presence.addUser();

		return presence;
	}

	private constructor({ stream, ws }: { stream: string; ws: ExtendedWebSocket }) {
		this.stream = stream;
		this.ws = ws;
		this.username = ws.session.user.username;
	}

	private notify(message: string) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify({ type: 'presence', stream: this.stream, message }), {
				binary: false
			});
		}
	}

	private async presentUsers() {
		// return all usernames in zrange sorted by oldest first
		return await this.pub.zrange(this.stream, -Infinity, +Infinity, 'BYSCORE');
	}

	private async broadcast() {
		const presentUsers = await this.presentUsers();
		await this.pub.publish(this.stream, JSON.stringify(presentUsers));
	}

	private async addUser() {
		// Insert username at current timestamp in zrange
		await this.pub.zadd(this.stream, Date.now(), this.username);
		this.broadcast();
	}

	private async removeUser() {
		await this.pub.zrem(this.stream, this.username);
		this.broadcast();
	}
}
