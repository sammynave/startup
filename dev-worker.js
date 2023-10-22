// import util from 'util';
import { spawn } from 'node:child_process';
import { argv } from 'node:process';

/*
	pass `--workers <number>` to spawn more worker processes
	example: `pnpm dev:worker --workers 2`
*/
async function startWorker() {
	const workersFlagIndex = argv.indexOf('--workers');
	let x = workersFlagIndex > -1 ? argv[Number(workersFlagIndex) + 1] : 1;
	let port = 5174;

	const children = [];
	while (x > 0) {
		const vite = spawn(
			'node_modules/.bin/vite',
			['dev', '--port', `${port}`, '--strictPort', 'true'],
			{
				env: { ...process.env, WORKER: 'true' }
			}
		);
		vite.stdout.on('data', (data) => {
			console.log(data.toString());
		});
		vite.stderr.on('data', (data) => {
			console.error(`vite stderr: ${data}`);
		});

		vite.on('close', (code, signal) => {
			console.log(`vite child process exited with code ${code}`);
			console.log(`vite child signal ${signal}`);
		});

		vite.on('kill', (code) => console.log(`kill ${code}`));

		vite.on('error', (code) => {
			console.log(`vite child process exited with code ${code}`);
		});
		children.push(vite);

		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Ping server to trigger `hooks.server.ts` to register the Faktory worker
		const curl = spawn('curl', [`http://localhost:${port}`]);

		curl.stdout.on('data', (data) => {
			console.log(`curl stdout: ${data}`);
		});
		curl.stderr.on('data', (data) => {
			console.error(`curl stderr: ${data}`);
		});

		curl.on('close', (code) => {
			console.log(`curl exited with code ${code}`);
		});
		x--;
		port++;
	}
	process.on('SIGINT', function () {
		console.log('Killing child process vite');
		children.forEach((vite) => vite.kill());
		process.exit();
	});
}

startWorker();