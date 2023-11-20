import { reloadAllClients } from '$lib/server/websockets/pub-sub/handler.js';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';
import { client } from '$lib/server/websockets/redis-client.js';
import type { Message } from '$lib/websockets/chat-store.js';
import { redisKey } from '$lib/server/websockets/pub-sub/chat.js';

const redisClient = client();

export const load: PageServerLoad = async ({ locals }) => {
	const { username } = locals.user;
	const messages = (await redisClient.lrange(
		redisKey('pubsub-chat'),
		0,
		-1
	)) as unknown as string[];

	return {
		username,
		messages: messages.reverse().map((message) => JSON.parse(message)) as Message[]
	};
};
export const actions: Actions = {
	default: async ({ locals }) => {
		redisClient.flushall();
		if (locals.psWss) {
			reloadAllClients(locals.psWss)('chat');
		}
		if (locals.sWss) {
			reloadAllClients(locals.sWss)('chat');
		}
		return true;
	}
};
