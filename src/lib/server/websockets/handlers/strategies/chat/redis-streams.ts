import { listener, pubClient } from '$lib/server/websockets/redis-client';
import { WebSocket } from 'ws';
import {
	GlobalThisWSS,
	type ExtendedWebSocket,
	type ExtendedGlobal
} from '../../../../../../../vite-plugins/vite-plugin-svelte-socket-server';

export class RedisStreams {
	static async init({
		ws,
		stream,
		username
	}: {
		ws: ExtendedWebSocket;
		stream: string;
		username: string;
	}) {
		return new RedisStreams({ stream, username, ws });
	}

	stream: string;
	username: string;
	ws: ExtendedWebSocket;
	constructor({
		ws,
		stream,
		username
	}: {
		ws: ExtendedWebSocket;
		stream: string;
		username: string;
	}) {
		this.ws = ws;
		this.stream = stream;
		this.username = username;
	}

	async receiveMessage({ username, message }: { username: string; message: string }) {
		// xadd inserts message id into stream
		const id = await pubClient().xadd(this.stream, '*', 'type', 'message');
		await pubClient().hset(`message:${id}`, {
			id,
			type: 'message',
			stream: this.stream,
			username,
			message
		});
	}

	async connected() {
		await listener.addClient(this);
		const id = await pubClient().xadd(this.stream, '*', 'type', 'message');
		await pubClient().hset(`message:${id}`, {
			id,
			type: 'connect',
			stream: this.stream,
			message: `${this.username} joined`
		});
	}
	async disconnected() {
		const id = await pubClient().xadd(this.stream, '*', 'type', 'message');
		await pubClient().hset(`message:${id}`, {
			id,
			type: 'disconnect',
			stream: this.stream,
			message: `${this.username} left`
		});
		console.log('REMOVING CLIENT IN redist-streams.ts');
		console.log(listener.id);
		console.log('before', listener.clients.size);
		await listener.removeClient(this);
		console.log('after', listener.clients.size);
		console.log('END REMOVING CLIENT IN redist-streams.ts');
	}

	async broadcast() {
		const client = this.client() as ExtendedWebSocket | null;
		if (client) {
			const lastSeenId = await pubClient().hget(`users:${this.username}`, this.stream);
			// prefix `chat.lastSeenId` with `(`, this makes the range exclusive. default is inclusive
			const id = lastSeenId ? `(${lastSeenId}` : '-';
			const results = await pubClient().xrange(this.stream, id, '+');
			if (results.length) {
				results.forEach(async ([id, [, type]]) => {
					const message = await pubClient().hgetall(`${type}:${id}`);
					client.send(JSON.stringify(message), { binary: false });
				});
				const lastId = results[results.length - 1][0];
				await pubClient().hset(`users:${this.username}`, this.stream, lastId);
			}
		}
	}

	private client() {
		let myClient: ExtendedWebSocket | null = null;

		const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
		wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && this.ws.socketId === client.socketId) {
				myClient = client;
			}
		});
		return myClient;
	}
}
