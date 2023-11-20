import {
	createPubSubWSSGlobalInstance,
	createStreamsWSSGlobalInstance,
	onHttpServerUpgrade
} from './src/lib/server/websockets/utils';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		{
			name: 'integratedWebsocketServer',
			configureServer(server) {
				createPubSubWSSGlobalInstance();
				createStreamsWSSGlobalInstance();
				server.httpServer?.on('upgrade', onHttpServerUpgrade);
			},
			configurePreviewServer(server) {
				createPubSubWSSGlobalInstance();
				createStreamsWSSGlobalInstance();
				server.httpServer?.on('upgrade', onHttpServerUpgrade);
			}
		}
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
