// See https://kit.svelte.dev/docs/types#app

import type { userRoles } from '$lib/server/db/schema';
import type { ExtendedWebSocketServer } from '$lib/server/websockets/setup';
import type { Session } from 'lucia';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface PageData {}
		// interface Platform {}
		interface Locals {
			auth: import('lucia').AuthRequest;
			user: Session['user'];
			wss?: ExtendedWebSocketServer;
		}
	}
}

type UserRoles = (typeof userRoles)['role']['enumValues'][number];

/// <reference types="lucia" />
declare global {
	namespace Lucia {
		type Auth = import('$lib/server/lucia.js').Auth;
		type DatabaseUserAttributes = {
			username: string;
			roles: UserRoles[];
		};
	}
}

export {};
