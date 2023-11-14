import { URL } from 'url';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import type { Server, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Session } from 'lucia';

export declare class ExtendedWebSocket extends WebSocket {
	socketId: string;
	session: Session;
	channel: string;
}

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export type ExtendedWebSocketServer = Server<typeof ExtendedWebSocket>;

export type ExtendedGlobal = typeof globalThis & {
	[GlobalThisWSS]: ExtendedWebSocketServer;
};

export const getWss = () => (globalThis as ExtendedGlobal)[GlobalThisWSS];
export const setWss = (wss: ExtendedWebSocketServer) => {
	(globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;
	return wss;
};

const isUrl = (url: string) => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
	const pathname = req.url && isUrl(req.url) ? new URL(req.url).pathname : null;

	if (pathname === '/websocket' || req.url?.includes('/websocket')) {
		const wss = getWss();

		wss.handleUpgrade(req, sock, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	}
};

export const createWSSGlobalInstance = () => {
	if (process.env.WORKER) {
		return;
	}

	const wss = setWss(new WebSocketServer({ noServer: true }));

	wss.on('connection', (ws) => {
		ws.socketId = nanoid();
		console.log(`[wss:global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:global] client disconnected (${ws.socketId})`);
		});
	});

	return wss;
};
