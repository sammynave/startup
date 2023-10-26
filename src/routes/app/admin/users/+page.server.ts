import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const results = await db.query.users.findMany();

	return { users: results };
};
