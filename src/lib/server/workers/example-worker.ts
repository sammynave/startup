import faktory from 'faktory-worker';

export const QUEUE_NAME = 'example';
export async function register() {
	faktory.register(QUEUE_NAME, async (taskArgs) => {
		console.log(`received example arg ${JSON.stringify(taskArgs)}`);
		await new Promise((r) => r(taskArgs));
	});

	const worker = await faktory.work().catch((error) => {
		console.error(`worker failed to start: ${error}`);
		process.exit(1);
	});

	worker.on('fail', ({ job, error }) => {
		console.error(`worker failed to start: ${error}. job: ${job}`);
	});
}
