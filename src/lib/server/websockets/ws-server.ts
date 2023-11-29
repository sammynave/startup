import { nanoid } from 'nanoid';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';

const isUrl = (url: string) => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};
function pathname(req: IncomingMessage) {
	return req.url && isUrl(req.url) ? new URL(req.url).pathname : null;
}
type SymType = WsServer['sym'];

export type ExtendedGlobal = typeof globalThis & {
	[SymType: SymType]: ExtendedWebSocketServer;
};

export class WsServer {
	endpoint: string;
	sym: symbol;

	constructor(endpoint: string) {
		this.endpoint = endpoint;
		this.sym = Symbol.for(`sveltekit-${endpoint}`);
	}

	getWss() {
		return (globalThis as ExtendedGlobal)[this.sym];
	}

	setWss(wss: ExtendedWebSocketServer) {
		(globalThis as ExtendedGlobal)[this.sym] = wss;
		return wss;
	}

	start() {
		if (process.env.WORKER) {
			return;
		}
		const wss = this.setWss(new WebSocketServer({ noServer: true }));
		wss.on('connection', function pluginWssHandler(ws: ExtendedWebSocket) {
			ws.socketId = nanoid();
			console.log(`[wss:pub-sub-global] client connected (${ws.socketId})`);

			ws.on('close', () => {
				console.log(`[wss:pub-sub-global] client disconnected (${ws.socketId})`);
			});
		});
	}

	upgrade(req: IncomingMessage, sock: Duplex, head: Buffer) {
		if (!this.getWss()) {
			throw 'WSS not started';
		}

		if (pathname(req) === this.endpoint || req.url?.includes(this.endpoint)) {
			const wss = this.getWss();

			wss.handleUpgrade(req, sock, head, (ws: ExtendedWebSocket) => {
				wss.emit('connection', ws, req);
			});
		}
	}
}
