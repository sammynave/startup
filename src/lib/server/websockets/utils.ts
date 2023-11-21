import { URL } from 'url';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import type { Server, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Session } from 'lucia';
import { PUB_SUB_PATH, STREAMS_PATH } from '../../websockets/constants.js';

export declare class ExtendedWebSocket extends WebSocket {
	socketId: string;
	session: Session;
	channel: string;
}

export const GlobalThisPubSubWSS = Symbol.for('sveltekit.psWss');
export const GlobalThisStreamsWSS = Symbol.for('sveltekit.sWss');

export type ExtendedWebSocketServer = Server<typeof ExtendedWebSocket>;

export type ExtendedGlobal = typeof globalThis & {
	[GlobalThisPubSubWSS]: ExtendedWebSocketServer;
	[GlobalThisStreamsWSS]: ExtendedWebSocketServer;
};

export const getPubSubWss = () => (globalThis as ExtendedGlobal)[GlobalThisPubSubWSS];
export const setPubSubWss = (wss: ExtendedWebSocketServer) => {
	(globalThis as ExtendedGlobal)[GlobalThisPubSubWSS] = wss;
	return wss;
};
export const getStreamsWss = () => (globalThis as ExtendedGlobal)[GlobalThisStreamsWSS];
export const setStreamsWss = (wss: ExtendedWebSocketServer) => {
	(globalThis as ExtendedGlobal)[GlobalThisStreamsWSS] = wss;
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

	if (pathname === STREAMS_PATH || req.url?.includes(STREAMS_PATH)) {
		const wss = getStreamsWss();

		wss.handleUpgrade(req, sock, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	}

	if (pathname === PUB_SUB_PATH || req.url?.includes(PUB_SUB_PATH)) {
		const wss = getPubSubWss();

		wss.handleUpgrade(req, sock, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	}
};

export const createPubSubWSSGlobalInstance = () => {
	if (process.env.WORKER) {
		return;
	}

	const wss = setPubSubWss(new WebSocketServer({ noServer: true }));

	wss.on('connection', (ws) => {
		ws.socketId = nanoid();
		console.log(`[wss:pub-sub-global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:pub-sub-global] client disconnected (${ws.socketId})`);
		});
	});

	return wss;
};

export const createStreamsWSSGlobalInstance = () => {
	if (process.env.WORKER) {
		return;
	}

	const wss = setStreamsWss(new WebSocketServer({ noServer: true }));

	wss.on('connection', (ws) => {
		ws.socketId = nanoid();
		console.log(`[wss:streams-global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:streams-global] client disconnected (${ws.socketId})`);
		});
	});

	return wss;
};
