import { listener, pubClient } from '$lib/server/websockets/redis-client';
import { WebSocket } from 'ws';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../../../vite-plugins/vite-plugin-svelte-socket-server';

export class RedisStreams {
	static async init({
		wss,
		ws,
		stream,
		username
	}: {
		wss: ExtendedWebSocketServer;
		ws: ExtendedWebSocket;
		stream: string;
		username: string;
	}) {
		return new RedisStreams({ wss, stream, username, ws });
	}

	stream: string;
	username: string;
	wss: ExtendedWebSocketServer;
	ws: ExtendedWebSocket;
	constructor({
		wss,
		ws,
		stream,
		username
	}: {
		ws: ExtendedWebSocket;
		wss: ExtendedWebSocketServer;
		stream: string;
		username: string;
	}) {
		this.ws = ws;
		this.wss = wss;
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
		console.log('adding listner');
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
		await listener.removeClient(this);
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
		this.wss.clients.forEach((client) => {
			console.log('TODO');
			console.log("`client` seems to be wrong/doesn't have a session");
			console.log({ internal: this.ws.socketId, extern: client.socketId });
			if (
				client.readyState === WebSocket.OPEN &&
				client.stream === this.stream &&
				this.ws.socketId === client.socketId
			) {
				myClient = client;
			}
		});
		return myClient;
	}
}
