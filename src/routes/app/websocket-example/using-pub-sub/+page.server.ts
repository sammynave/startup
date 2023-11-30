import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { client } from '$lib/server/websockets/redis-client.js';
import type { Message } from '$lib/websockets/chat-store.js';
import { reloadAllClients } from '$lib/server/websockets/reload-clients';
import { COMBINED_PATH } from '$lib/websockets/constants';

const redisClient = client();
const chatStream = 'chat_messages:pub-sub:pub-sub-chat';
const presenceStream = 'presence:pub-sub:pub-sub-chat';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { username } = locals.user;
	const messages = (await redisClient.lrange(chatStream, 0, -1)) as unknown as string[];

	const { protocol, host } = url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
	const features = [
		{ type: 'chat', strategy: 'redis-pub-sub', stream: chatStream },
		{ type: 'presence', strategy: 'redis-pub-sub', stream: presenceStream }
	];
	return {
		url: `${wsProtocol}//${host}${COMBINED_PATH}?features=${JSON.stringify(features)}`,
		username,
		messages: messages.reverse().map((message) => JSON.parse(message)) as Message[]
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		redisClient.flushall();
		if (locals.wss) {
			reloadAllClients(locals.wss)('pub-sub-chat');
		}
		return true;
	}
};
