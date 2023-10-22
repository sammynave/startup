import { auth } from '$lib/server/lucia.js';
import { redirect, type Handle } from '@sveltejs/kit';
import { initExampleQueue } from '$lib/workers/example-queue.js';

if (process.env.WORKER) {
	initExampleQueue();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.auth = auth.handleRequest(event);
	if (event.url.pathname.startsWith('/app')) {
		const session = await event.locals.auth.validate();
		if (!session) {
			throw redirect(302, '/sign-in');
		}
	}

	return await resolve(event);
};
