import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { integratedWebsocketServer } from './vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';

export default defineConfig({
	plugins: [sveltekit(), integratedWebsocketServer()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
