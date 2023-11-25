import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../../vite-plugins/vite-plugin-svelte-socket-server';
import { RedisPubSub } from './strategies/chat/redis-pub-sub';
import { RedisStreams } from './strategies/chat/redis-streams';

const strategies = {
	'pub-sub': RedisPubSub,
	streams: RedisStreams
};

export class Chat {
	static async init({
		stream,
		strategy,
		ws,
		wss,
		username
	}: {
		stream: string;
		strategy: 'pub-sub' | 'streams';
		ws: ExtendedWebSocket;
		wss: ExtendedWebSocketServer;
		username: string;
	}) {
		const s = await strategies[strategy].init({ wss, stream, username });
		return new Chat({ strategy: s });
	}

	strategy: RedisPubSub | RedisStreams;

	constructor({ strategy }: { strategy: RedisPubSub | RedisStreams }) {
		this.strategy = strategy;
	}
	async connected(username: string) {
		console.log('cccccccc');
		await this.strategy.connected(username);
	}
	async receiveMessage({ username, message }: { username: string; message: string }) {
		console.log('r');
		await this.strategy.receiveMessage({ username, message });
	}
	async disconnected(username: string) {
		console.log('d');
		await this.strategy.disconnected(username);
	}
}
