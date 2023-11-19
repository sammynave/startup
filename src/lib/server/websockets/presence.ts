import type { Redis } from 'ioredis';
import type { ExtendedWebSocketServer } from './utils';
import { pubClient, subClient } from './redis-client';
import { WebSocket } from 'ws';

export class Presence {
	wss: ExtendedWebSocketServer;
	channel: string;
	redisChannel: string;
	sub: Redis;
	pub: Redis;

	private constructor({
		wss,
		channel,
		pub,
		sub
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		pub: Redis;
		sub: Redis;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.redisChannel = `presence:${channel}`;
		this.sub = sub;
		this.pub = pub;
	}

	static async init({ wss, channel }: { wss: ExtendedWebSocketServer; channel: string }) {
		const pub = pubClient();
		const sub = subClient();

		const currentSubscriptions = await pub.pubsub('CHANNELS');
		const presence = new Presence({ wss, channel, pub, sub });

		if (!currentSubscriptions.includes(presence.redisChannel)) {
			// Don't over subscribe.
			// WARNING: any changes to this block will not get picked up during HMR.
			// restart server (or remove `if` statement)
			// NOTE if you remove the `if` then you will have multiple subscribers and you will get duplicate socket messages)
			sub.subscribe(presence.redisChannel, (err) => {
				if (err) {
					console.error('Failed to subscribe: %s', err.message);
				}
			});

			sub.on('message', (redisChannel, message) => {
				if (presence.redisChannel === redisChannel) {
					// this is sendPresentUsers
					presence.notifyClients(JSON.parse(message));
				}
			});
		}

		return presence;
	}

	private notifyClients(message: string) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && client.channel === this.channel) {
				client.send(
					JSON.stringify({
						type: 'presence',
						channel: this.channel,
						message
					}),
					{ binary: false }
				);
			}
		});
	}

	async presentUsers() {
		// return all entries in zrange sorted by oldest first
		return await this.pub.zrange(this.redisChannel, -Infinity, +Infinity, 'BYSCORE');
	}

	async add(username: string) {
		// Insert username at current timestamp in zrange
		await this.pub.zadd(this.redisChannel, Date.now(), username);
		this.notify();
	}

	async remove(username: string) {
		await this.pub.zrem(this.redisChannel, username);
		this.notify();
	}

	async notify() {
		const presentUsers = await this.presentUsers();
		await this.pub.publish(this.redisChannel, JSON.stringify(presentUsers));
	}
}
