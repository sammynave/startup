import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Message } from '$lib/websockets/chat-store.js';
import { redisKey } from '$lib/server/websockets/streams/chat.js';
import { streamsClient } from '$lib/server/websockets/redis-client';
import { reloadAllClients } from '$lib/server/websockets/reload-clients';

const redisClient = streamsClient();

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw redirect(302, '/sign-up');
	}

	const { username } = locals.user;
	const channel = redisKey('streams-chat');
	const results = await redisClient.xrange(channel, '-', '+');
	const messages = (await Promise.all(
		results
			.filter(([, [, type]]) => type === 'message')
			.map(async ([messageId, [, type]]) => await redisClient.hgetall(`${type}:${messageId}`))
	)) as Message[];
	const lastSeenId = messages[messages.length - 1]?.id ?? null;
	await redisClient.hset(`users:${session.user.username}`, channel, lastSeenId);

	return {
		username,
		messages
	};
};
export const actions: Actions = {
	default: async ({ locals }) => {
		redisClient.flushall();
		if (locals.psWss) {
			reloadAllClients(locals.psWss)('pubsub-chat');
		}
		if (locals.sWss) {
			reloadAllClients(locals.sWss)('streams-chat');
		}
		return true;
	}
};
