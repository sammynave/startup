import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Message } from '$lib/websockets/chat-store.js';
import { reloadAllClients } from '$lib/server/websockets/reload-clients';
import { COMBINED_PATH } from '$lib/websockets/constants';
import { client } from '$lib/server/websockets/redis-client';

const redisClient = client();
const chatStream = 'chat_messages:streams:streams-chat';
const presenceStream = 'presence:streams:streams-chat';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth.validate();
	if (!session) {
		redirect(302, '/sign-up');
	}

	const { username } = locals.user;

	const results = await redisClient.xrange(chatStream, '-', '+');
	const messages = (await Promise.all(
		results.map(async ([messageId, [, type]]) => await redisClient.hgetall(`${type}:${messageId}`))
	)) as Message[];

	const lastSeenId = messages[messages.length - 1]?.id ?? null;
	await redisClient.hset(`users:${session.user.username}`, chatStream, lastSeenId);

	const filteredMessages = messages.filter(({ type }) => type === 'message');

	const { protocol, host } = url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
	const features = [
		{ type: 'chat', strategy: 'redis-streams', stream: chatStream },
		{ type: 'presence', strategy: 'redis-streams', stream: presenceStream }
	];

	return {
		username,
		messages: filteredMessages,
		url: `${wsProtocol}//${host}${COMBINED_PATH}?features=${JSON.stringify(features)}`
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		redisClient.flushall();
		if (locals.wss) {
			reloadAllClients(locals.wss)(chatStream);
		}
		return true;
	}
};
