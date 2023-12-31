import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WsServer } from '../src/lib/server/websockets/ws-server';
import { COMBINED_PATH } from '../src/lib/websockets/constants';
import type { Session } from 'lucia';
// @ts-expect-error waiting for lib to be updated
import type { WebSocket, Server } from 'ws';
import type { ViteDevServer, PreviewServer } from 'vite';

export declare class ExtendedWebSocket extends WebSocket {
	session: Session;
	stream: string;
}

export type ExtendedWebSocketServer = Server<typeof ExtendedWebSocket>;

export const servers = {
	[COMBINED_PATH]: new WsServer(COMBINED_PATH)
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
	Object.values(servers).forEach((s) => s.upgrade(req, sock, head));
};

export const createWSSGlobalInstances = () => {
	Object.values(servers).forEach((s) => s.start());
};
export function integratedWebsocketServer() {
	return {
		name: 'integratedWebsocketServer',
		configureServer(server: ViteDevServer) {
			createWSSGlobalInstances();
			server.httpServer?.on('upgrade', onHttpServerUpgrade);
		},
		configurePreviewServer(server: PreviewServer) {
			createWSSGlobalInstances();
			server.httpServer?.on('upgrade', onHttpServerUpgrade);
		}
	};
}
