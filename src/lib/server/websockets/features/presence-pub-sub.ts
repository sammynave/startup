import type { Redis } from 'ioredis';
import { client, create } from '../redis-client.js';
import { WebSocket } from 'ws';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';

export class PresencePubSub {
	wss: ExtendedWebSocketServer;
	channel: string;
	sub: Redis;
	pub: Redis;
	ws: ExtendedWebSocket;

	private constructor({
		wss,
		channel,
		pub,
		sub,
		ws
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		pub: Redis;
		sub: Redis;
		ws: ExtendedWebSocket;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.sub = sub;
		this.pub = pub;
		this.ws = ws;
	}

	static async init({
		wss,
		channel,
		ws
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		ws: ExtendedWebSocket;
	}) {
		const pub = client();
		const sub = create();

		const presence = new PresencePubSub({ ws, wss, channel, pub, sub });

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

		await presence.add(ws.session.user.username);

		ws.on('close', async () => {
			await presence.remove(ws.session.user.username);
			subscription.unsubscribe();
		});

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

	async presentUsers() {
		// return all entries in zrange sorted by oldest first
		return await this.pub.zrange(this.channel, -Infinity, +Infinity, 'BYSCORE');
	}

	async add(username: string) {
		// Insert username at current timestamp in zrange
		await this.pub.zadd(this.channel, Date.now(), username);
		this.broadcast();
	}

	async remove(username: string) {
		await this.pub.zrem(this.channel, username);
		this.broadcast();
	}

	async broadcast() {
		const presentUsers = await this.presentUsers();
		await this.pub.publish(this.channel, JSON.stringify(presentUsers));
	}
}
