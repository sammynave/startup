import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { svelteSocketSever } from './vite-plugins/vite-plugin-svelte-socket-server';

export default defineConfig({
	plugins: [sveltekit(), svelteSocketSever({ endpoint: '/ws' })],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
