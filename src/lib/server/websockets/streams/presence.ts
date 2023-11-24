import type { Redis } from 'ioredis';
import type { ExtendedWebSocket, ExtendedWebSocketServer } from '../setup.js';
import { streamsClient, streamsSubClient } from '../redis-client.js';
import { WebSocket } from 'ws';
import { redisPresenceKey } from './chat.js';

export class Presence {
	wss: ExtendedWebSocketServer;
	channel: string;
	redisChannel: string;
	redisClient: Redis = streamsClient();
	sub: Redis = streamsSubClient();
	username: string;

	private constructor({
		wss,
		channel,
		username
	}: {
		wss: ExtendedWebSocketServer;
		channel: string;
		username: string;
	}) {
		this.wss = wss;
		this.channel = channel;
		this.redisChannel = redisPresenceKey(`${channel}`);
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
		const presence = new Presence({ wss, channel, username });

		return presence;
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
			const users = await this.presentUsers();
			client.send(JSON.stringify({ type: 'presence', message: users, channel: this.channel }));
		}
	}

	async presentUsers() {
		// return all entries in zrange sorted by oldest first
		return await this.redisClient.zrange(
			`set:${this.redisChannel}`,
			-Infinity,
			+Infinity,
			'BYSCORE'
		);
	}

	async add(username: string) {
		// Insert username at current timestamp in zrange
		await this.redisClient.zadd(`set:${this.redisChannel}`, Date.now(), username);
		await this.broadcast();
	}

	async remove(username: string) {
		await this.redisClient.zrem(`set:${this.redisChannel}`, username);
		await this.broadcast();
	}

	async broadcast() {
		await this.redisClient.xadd(this.redisChannel, '*', 'type', 'presence');
	}
}
