import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WsServer } from './ws-server';
import { PUB_SUB_PATH, STREAMS_PATH } from '../../websockets/constants';
import type { Session } from 'lucia';
import type { Server, WebSocket } from 'ws';

export declare class ExtendedWebSocket extends WebSocket {
	socketId: string;
	session: Session;
	channel: string;
}

export type ExtendedWebSocketServer = Server<typeof ExtendedWebSocket>;

export const servers = {
	[STREAMS_PATH]: new WsServer(STREAMS_PATH),
	[PUB_SUB_PATH]: new WsServer(PUB_SUB_PATH)
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
	Object.values(servers).forEach((s) => s.upgrade(req, sock, head));
};

export const createWSSGlobalInstances = () => {
	Object.values(servers).forEach((s) => s.start());
};
