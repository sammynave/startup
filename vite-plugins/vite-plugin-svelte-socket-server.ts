import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Session } from 'lucia';
import { WebSocketServer, type Server, type WebSocket } from 'ws';
import { nanoid } from 'nanoid';

export declare class ExtendedWebSocket extends WebSocket {
	socketId: string;
	// session: Session; stream: string;
}

export type ExtendedWebSocketServer = Server<typeof ExtendedWebSocket>;

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export type ExtendedGlobal = typeof globalThis & {
	[GlobalThisWSS]: ExtendedWebSocketServer;
};

const isUrl = (url: string) => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

const pathname = (req: IncomingMessage) => {
	return req.url && isUrl(req.url) ? new URL(req.url).pathname : null;
};

const upgrade =
	({ endpoint }: { endpoint: string }) =>
	(req: IncomingMessage, sock: Duplex, head: Buffer) => {
		const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
		if (!wss) {
			throw 'WSS not started';
		}

		if (pathname(req) === endpoint || req.url?.includes(endpoint)) {
			wss.handleUpgrade(req, sock, head, (ws: ExtendedWebSocket) => {
				wss.emit('connection', ws, req);
			});
		}
	};

const create = () => {
	if (process.env.WORKER) {
		return;
	}

	const wss = new WebSocketServer({ noServer: true }) as ExtendedWebSocketServer;
	(globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;

	wss.on('connection', function pluginConnection(ws) {
		ws.socketId = nanoid();
		console.log(`[wss:global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:global] client disconnected (${ws.socketId})`);
		});
	});
	return wss;
};

export function svelteSocketSever({ endpoint }: { endpoint: string }) {
	return {
		name: 'svelte-socket-server',
		configureServer(server: any) {
			create();
			server.httpServer?.on('upgrade', upgrade({ endpoint }));
		},
		configurePreviewServer(server: any) {
			create();
			server.httpServer?.on('upgrade', upgrade({ endpoint }));
		}
	};
}
