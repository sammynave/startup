import type { WebSocketServer } from 'ws';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../vite-plugins/vite-plugin-svelte-socket-server';

class RedisStreams {
	constructor({ wss, stream }: { wss: ExtendedWebSocketServer; stream: string }) {
		this.wss = wss;
		this.stream = stream;
	}
	receiveMessage() {}
	connected() {}
	disconnected() {}
	broadcast() {}
}

class RedisPubSub {
	constructor({ wss, stream }: { wss: ExtendedWebSocketServer; stream: string }) {
		this.wss = wss;
		this.stream = stream;
	}
	receiveMessage() {}
	connected() {}
	disconnected() {}
	broadcast() {}
}

const strategies = {
	'pub-sub': RedisPubSub,
	streams: RedisStreams
};

export class Chat {
	static async init({
		stream,
		strategy,
		ws,
		wss
	}: {
		stream: string;
		strategy: 'pub-sub' | 'streams';
		ws: ExtendedWebSocket;
		wss: ExtendedWebSocketServer;
	}) {
		const strat = new strategies[strategy]({ wss, stream });
		const chat = new Chat({ strategy: strat });
	}

	strategy: RedisPubSub | RedisStreams;

	constructor({ strategy }: { strategy: RedisPubSub | RedisStreams }) {
		this.strategy = strategy;
	}

	async connected(userId: string) {
		await this.strategy.connected({ userId: string });
	}
	async receiveMessage({ userId, message }: { userId: string; message: string }) {
		await this.strategy.receiveMessage({ userId, message });
	}
	async disconnected(userId: string) {
		await this.strategy.disconnected({ userId: string });
	}
}
