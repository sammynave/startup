import type { ExtendedWebSocket } from '../../../../../vite-plugins/vite-plugin-svelte-socket-server';
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
		username
	}: {
		stream: string;
		strategy: 'pub-sub' | 'streams';
		ws: ExtendedWebSocket;
		username: string;
	}) {
		const s = await strategies[strategy].init({ stream, username, ws });
		return new Chat({ strategy: s });
	}

	strategy: RedisPubSub | RedisStreams;

	constructor({ strategy }: { strategy: RedisPubSub | RedisStreams }) {
		this.strategy = strategy;
	}
	get stream() {
		return this.strategy.stream;
	}
	async connected(username: string) {
		await this.strategy.connected(username);
	}
	async receiveMessage({ username, message }: { username: string; message: string }) {
		await this.strategy.receiveMessage({ username, message });
	}
	async disconnected(username: string) {
		await this.strategy.disconnected(username);
	}
}
