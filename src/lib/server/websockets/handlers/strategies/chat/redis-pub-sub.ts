import { pubClient, subClient } from '$lib/server/websockets/redis-client';
import type { ExtendedWebSocketServer } from '../../../../../../../vite-plugins/vite-plugin-svelte-socket-server';

export class RedisPubSub {
	static async init({
		wss,
		stream,
		username
	}: {
		wss: ExtendedWebSocketServer;
		stream: string;
		username: string;
	}) {
		const currentSubscriptions = await pubClient().pubsub('CHANNELS');

		const rps = new RedisPubSub({ wss, stream, username });

		if (!currentSubscriptions.includes(rps.stream)) {
			// Don't over subscribe.
			// WARNING: any changes to this block will not get picked up during HMR.
			// restart server (or remove `if` statement)
			// NOTE if you remove the `if` then you will have multiple subscribers and you will get duplicate socket messages)
			subClient().subscribe(rps.stream, (err) => {
				if (err) {
					console.error('Failed to subscribe: %s', err.message);
				}
			});

			subClient().on('message', (stream, message) => {
				if (stream === rps.stream) {
					rps.broadcast(message);
				}
			});
		}

		return;
	}

	stream: string;
	username: string;
	wss: ExtendedWebSocketServer;
	constructor({
		wss,
		stream,
		username
	}: {
		wss: ExtendedWebSocketServer;
		stream: string;
		username: string;
	}) {
		this.wss = wss;
		this.stream = stream;
		this.username = username;
	}

	async receiveMessage({ username, message }: { username: string; message: string }) {
		const chatMessage = JSON.stringify({
			type: 'message',
			stream: this.stream,
			username,
			message
		});
		await pubClient().lpush(this.stream, chatMessage);
		await pubClient().publish(this.stream, chatMessage);
	}

	async connected() {
		const message = JSON.stringify({
			type: 'connect',
			stream: this.stream,
			message: `${this.username} joined`
		});
		await pubClient().publish(this.stream, message);
	}

	async disconnected() {
		const message = JSON.stringify({
			type: 'disconnect',
			stream: this.stream,
			message: `${this.username} left`
		});
		await pubClient().publish(this.stream, message);
	}

	broadcast(message) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN && client.stream === this.stream) {
				client.send(message, { binary: false });
			}
		});
	}
}
