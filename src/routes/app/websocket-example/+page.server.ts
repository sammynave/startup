import { reloadAllClients } from '$lib/server/websockets/handler';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { client } from '$lib/server/websockets/redis-client';
import type { Message } from '$lib/websockets/chat-store';

const redisClient = client();

export const load: PageServerLoad = async ({ locals }) => {
	const { username } = locals.user;
	const messages = (await redisClient.lrange(`chat_messages:chat`, 0, -1)) as unknown as string[];

	return {
		username,
		messages: messages.reverse().map((message) => JSON.parse(message)) as Message[]
	};
};
export const actions: Actions = {
	default: async ({ locals }) => {
		if (locals.wss) {
			redisClient.flushall();
			reloadAllClients(locals.wss)('chat');
		}
		return true;
	}
};
