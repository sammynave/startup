import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';
import type { Message } from '$lib/websockets/chat-store.js';
import { redisKey } from '$lib/server/websockets/streams/chat.js';
import { streamsClient } from '$lib/server/websockets/redis-client';
import { reloadAllClients } from '$lib/server/websockets/streams/handler';

const redisClient = streamsClient();

export const load: PageServerLoad = async ({ locals }) => {
	const { username } = locals.user;
	const channel = redisKey('streams-chat');
	const results = await redisClient.xrange(channel, '-', '+');
	const messages = (await Promise.all(
		results
			.filter(([, [, type]]) => type === 'message')
			.map(async ([messageId, [, type]]) => await redisClient.hgetall(`${type}:${messageId}`))
	)) as Message[];
	return {
		username,
		messages
	};
};
export const actions: Actions = {
	default: async ({ locals }) => {
		redisClient.flushall();
		if (locals.sWss) {
			reloadAllClients(locals.sWss)('chat');
		}
		if (locals.psWss) {
			reloadAllClients(locals.psWss)('chat');
		}
		return true;
	}
};
