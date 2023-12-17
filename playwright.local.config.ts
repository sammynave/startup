import type { PlaywrightTestConfig } from '@playwright/test';

// NOTE: this file is ignored by the vite reloader.
// import type { FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import startEnvironment from './tests/playwright-setup';

dotenv.config({ path: '.env.testing' });

await startEnvironment();

const config: PlaywrightTestConfig = {
	// this config as it is almost 8x faster per test and closer
	// to a prod env but forgoes HMR since you need to build the whole app
	// this is useful when you want to run closer to what CI will run without
	// waiting for CI
	// webServer: {
	// 	command: 'pnpm run build --mode testing && pnpm run preview --mode testing',
	// 	port: 4173
	// },

	// Make this configurable. This one is useful when developing but is much slower
	// this takes ~8.3 seconds vs build+preview's ~1.2 seconds for `can chat` test
	webServer: {
		command: 'NODE_ENV=development pnpm run dev --mode testing',
		port: 5173,
		stdout: 'pipe'
	},

	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
