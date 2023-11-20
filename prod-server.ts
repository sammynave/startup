import * as path from 'path';
import * as url from 'url';
import {
	createWSSGlobalInstances,
	onHttpServerUpgrade
} from './vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

createWSSGlobalInstances();

const { server } = await import(path.resolve(__dirname, './build/index.js'));
server.server.on('upgrade', onHttpServerUpgrade);
