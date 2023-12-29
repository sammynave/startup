import Redis from 'ioredis';
// Need to use this because $env fails in playwright
import 'dotenv/config';

const connectionString = process.env.REDIS_WS_SERVER as string;

let cli: Redis | null = null;
export const create = (options = {}) => new Redis(connectionString, options);
export const client = () => {
	cli = cli ? cli : create();
	return cli;
};
