import { enqueue } from '$lib/server/jobs/example-job.js';

export const actions = {
	'example-job': async () => {
		const jobId = await enqueue({ exampleArg: 'this is the argument to the example job!' });
		return {
			jobId
		};
	}
};
