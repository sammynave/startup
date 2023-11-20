import Redis from 'ioredis';
import { REDIS_WS_SERVER } from '$env/static/private';

let pub: Redis | null = null;
let sub: Redis | null = null;
let cli: Redis | null = null;
let streams: Redis | null = null;
let streamsSub: Redis | null = null;

export const pubClient = () => {
	pub = pub ? pub : new Redis(REDIS_WS_SERVER);
	return pub;
};

export const subClient = () => {
	sub = sub ? sub : new Redis(REDIS_WS_SERVER);
	return sub;
};

export const client = () => {
	cli = cli ? cli : new Redis(REDIS_WS_SERVER);
	return cli;
};

export const streamsClient = () => {
	streams = streams ? streams : new Redis(REDIS_WS_SERVER);
	return streams;
};
export const streamsSubClient = () => {
	streamsSub = streamsSub ? streamsSub : new Redis(REDIS_WS_SERVER);
	return streamsSub;
};
