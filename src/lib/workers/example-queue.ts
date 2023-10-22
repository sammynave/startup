import Queue from 'bull';
export const exampleQueue = new Queue('example-queue');
export function initExampleQueue() {
	if (process.env.WORKER) {
		exampleQueue.process(async (job) => {
			console.log('exampleQueue job successfully processed with', data);
			done();
		});
	} else {
		throw 'This is a webserver, not a worker. Make sure set the env var `WORKER=true` when starting up this process';
	}
}
