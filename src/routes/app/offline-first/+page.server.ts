import type { PageServerLoad } from './$types';
import { COMBINED_PATH } from '$lib/websockets/constants';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { username, userId } = locals.user;
	const { protocol, host } = url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
	const dbName = `${userId}.db`;
	const features = [{ type: 'offline', strategy: 'sync', stream: dbName }];
	return {
		url: `${wsProtocol}//${host}${COMBINED_PATH}?features=${JSON.stringify(features)}`,
		username,
		dbName
	};
};
