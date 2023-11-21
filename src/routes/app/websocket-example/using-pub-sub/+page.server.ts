import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from '../$types';
import { client } from '$lib/server/websockets/redis-client.js';
import type { Message } from '$lib/websockets/chat-store.js';
import { redisKey } from '$lib/server/websockets/pub-sub/chat.js';
import { reloadAllClients } from '$lib/server/websockets/reload-clients';

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
	// TODOO
	// TODOO
	// TODOO
	// TODOO
	// TODOO
	// TODOO
	// TODOO
	// TODOO
	// THIS DOESON"T WORKER
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
