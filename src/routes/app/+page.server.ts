import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';
import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/lucia';
import { exampleQueue } from '$lib/workers/example-queue.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth.validate();
	const userId = session?.user?.userId;
	if (!userId) {
		throw redirect(302, '/sign-in');
	}
	const result = await db.query.users.findFirst({
		columns: { username: true },
		where: eq(users.id, userId)
	});

	return {
		userId,
		username: result?.username
	};
};

export const actions = {
	'example-job': async ({ request }) => {
		const job = await exampleQueue.add({ foo: 'bar' });
		console.log({ job });
		return {
			job: 'done'
		};
	},
	'sign-out': async ({ locals }) => {
		const session = await locals.auth.validate();
		if (!session) return fail(401);
		await auth.invalidateSession(session.sessionId); // invalidate session
		locals.auth.setSession(null); // remove cookie
		throw redirect(302, '/sign-in'); // redirect to sign in page
	}
};
