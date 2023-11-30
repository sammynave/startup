import { client, create } from '../redis-client';
import { WebSocket } from 'ws';
import type { ExtendedWebSocket } from '../../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import type { Redis } from 'ioredis';

export class ChatPubSub {
	channel: string;
	private ws: ExtendedWebSocket;
	private redisClient: Redis = client();

	/*
	 This is the preferred way to instantiate this class for 2 reasons:
	  1. If we use the class in multiple places, we want to avoid duplicating all of this setup.
	 	2. Constructors can not be asynchronous so the only way to encapsulate the setup is through
		   a static method
	*/
	static async init({ ws, channel }: { channel: string; ws: ExtendedWebSocket }) {
		const chat = new ChatPubSub({ ws, channel });

		const sub = create();
		await sub.subscribe(chat.channel, (err) => {
			if (err) {
				console.error('Failed to subscribe: %s', err.message);
			}
		});
		const subscription = await sub.on('message', (channel, message) => {
			if (channel === chat.channel) {
				chat.notify(message);
			}
		});

		ws.on('message', async (data: string) => {
			const { message } = JSON.parse(data);
			await chat.received(message);
		});

		ws.on('close', async () => {
			await chat.disconnected();
			subscription.unsubscribe();
		});

		await chat.connected();

		return chat;
	}

	private constructor({ ws, channel }: { ws: ExtendedWebSocket; channel: string }) {
		this.ws = ws;
		this.channel = channel;
	}

	private notify(message: string) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message, { binary: false });
		}
	}

	private async connected() {
		const message = JSON.stringify({
			type: 'connect',
			channel: this.channel,
			message: `${this.ws.session.user.username} joined`
		});
		await this.redisClient.publish(this.channel, message);
	}

	private async disconnected() {
		const message = JSON.stringify({
			type: 'disconnect',
			channel: this.channel,
			message: `${this.ws.session.user.username} left`
		});
		await this.redisClient.publish(this.channel, message);
	}

	private async received(message: string) {
		const chatMessage = JSON.stringify({
			type: 'message',
			channel: this.channel,
			username: this.ws.session.user.username,
			message
		});
		await this.redisClient.lpush(this.channel, chatMessage);
		await this.redisClient.publish(this.channel, chatMessage);
	}
}
