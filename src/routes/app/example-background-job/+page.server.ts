import { fail } from '@sveltejs/kit';
import { enqueue } from '$lib/server/jobs/example-job.js';

export const actions = {
	'example-job': async ({ locals }) => {
		const session = await locals.auth.validate();
		if (!session) return fail(401);
		const jobId = await enqueue({ exampleArg: 'this is the argument to the example job!' });
		return {
			jobId
		};
	}
};
