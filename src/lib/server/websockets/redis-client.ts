import Redis from 'ioredis';
import { REDIS_WS_SERVER } from '$env/static/private';

let cli: Redis | null = null;

export const create = () => new Redis(REDIS_WS_SERVER);
export const client = () => {
	cli = cli ? cli : create();
	return cli;
};
