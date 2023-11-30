import type { Redis } from 'ioredis';
import { client, create } from '../redis-client.js';
import { WebSocket } from 'ws';
import type { ExtendedWebSocket } from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';

export class PresencePubSub {
	channel: string;
	private pub: Redis = client();
	private ws: ExtendedWebSocket;

	static async init({ channel, ws }: { channel: string; ws: ExtendedWebSocket }) {
		const presence = new PresencePubSub({ ws, channel });

		const sub = create();
		await sub.subscribe(presence.channel, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});

		const subscription = await sub.on('message', (channel, message) => {
			if (presence.channel === channel) {
				presence.notify(JSON.parse(message));
			}
		});

		ws.on('close', async () => {
			await presence.remove(ws.session.user.username);
			subscription.unsubscribe();
		});

		await presence.add(ws.session.user.username);

		return presence;
	}

	private notify(message: string) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(
				JSON.stringify({
					type: 'presence',
					channel: this.channel,
					message
				}),
				{ binary: false }
			);
		}
	}

	private constructor({ channel, ws }: { channel: string; ws: ExtendedWebSocket }) {
		this.channel = channel;
		this.ws = ws;
	}

	private async add(username: string) {
		// Insert username at current timestamp in zrange
		await this.pub.zadd(this.channel, Date.now(), username);
		this.broadcast();
	}

	private async remove(username: string) {
		await this.pub.zrem(this.channel, username);
		this.broadcast();
	}

	private async broadcast() {
		const presentUsers = await this.presentUsers();
		await this.pub.publish(this.channel, JSON.stringify(presentUsers));
	}

	private async presentUsers() {
		// return all entries in zrange sorted by oldest first
		return await this.pub.zrange(this.channel, -Infinity, +Infinity, 'BYSCORE');
	}
}
