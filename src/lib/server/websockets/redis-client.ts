import Redis from 'ioredis';
import { REDIS_WS_SERVER } from '$env/static/private';
import 'dotenv/config';

const connectionString = REDIS_WS_SERVER;

let cli: Redis | null = null;
export const create = () => new Redis(connectionString);
export const client = () => {
	cli = cli ? cli : create();
	return cli;
};
