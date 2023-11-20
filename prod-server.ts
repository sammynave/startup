import * as path from 'path';
import * as url from 'url';
import {
	createPubSubWSSGlobalInstance,
	createStreamsWSSGlobalInstance,
	onHttpServerUpgrade
} from './src/lib/server/websockets/utils.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

createPubSubWSSGlobalInstance();
createStreamsWSSGlobalInstance();

const { server } = await import(path.resolve(__dirname, './build/index.js'));
server.server.on('upgrade', onHttpServerUpgrade);
