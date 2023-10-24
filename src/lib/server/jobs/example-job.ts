import faktory from 'faktory-worker';
import { QUEUE_NAME } from '$lib/server/workers/example-worker.js';

export async function enqueue({ exampleArg }: { exampleArg: string }) {
	const client = await faktory.connect();
	const backgroundJobId = client.job(QUEUE_NAME, { exampleArg }).push();
	await client.close();
	return backgroundJobId;
}
