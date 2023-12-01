import { client, create } from '../../redis-client';
import { WebSocket } from 'ws';
import type { ExtendedWebSocket } from '../../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';

export class Chat {
	private stream: string;
	private ws: ExtendedWebSocket;
	private username: string;
	private redisClient: Redis = client();

	/*
	 This is the preferred way to instantiate this class for 2 reasons:
	  1. If we use the class in multiple places, we want to avoid duplicating all of this setup.
	 	2. Constructors can not be asynchronous so the only way to encapsulate the setup is through
		   a static method
	*/
	static async init({ ws, stream }: { stream: string; ws: ExtendedWebSocket }) {
		const chat = new Chat({ ws, stream });

		// Once a Redis client calls `subscribe` it no longer responds to any
		// other commands so a new client is needed
		const subClient = create();
		await subClient.subscribe(chat.stream, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});
		const subscription = await subClient.on('message', (stream, message) => {
			if (stream === chat.stream) {
				chat.notify(message);
			}
		});

		await chat.connect();

		ws.on('message', async (data: string) => {
			const { message } = JSON.parse(data);
			await chat.receive(message);
		});

		ws.on('close', async () => {
			await chat.disconnect();
			await subscription.unsubscribe();
		});

		return chat;
	}

	private constructor({ ws, stream }: { ws: ExtendedWebSocket; stream: string }) {
		this.stream = stream;
		this.ws = ws;
		this.username = ws.session.user.username;
	}

	private notify(message: string) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message, { binary: false });
		}
	}

	private async publishMessage({
		type,
		message
	}: {
		type: 'connect' | 'disconnect' | 'message';
		message: string;
	}) {
		const chatMessage = JSON.stringify({
			type,
			stream: this.stream,
			username: this.username,
			message
		});

		// Persist messages. This lets us pre-populate the chat on page load
		// with any messages that happened while this user was away/did not
		// have an active subscription to this stream
		if (type === 'message') {
			await this.redisClient.lpush(this.stream, chatMessage);
		}

		await this.redisClient.publish(this.stream, chatMessage);
	}

	private async connect() {
		await this.publishMessage({ type: 'connect', message: `${this.username} joined` });
	}

	private async disconnect() {
		await this.publishMessage({ type: 'disconnect', message: `${this.username} left` });
	}

	private async receive(message: string) {
		await this.publishMessage({ type: 'message', message });
	}
}
