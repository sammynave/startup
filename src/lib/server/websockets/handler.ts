import type { IncomingMessage } from 'http';
import { Presence as PresenceStreams } from './features/redis-streams/presence';
import { Presence as PresencePubSub } from './features/redis-pub-sub/presence';
import { Chat as ChatStreams } from './features/redis-streams/chat.js';
import { Chat as ChatPubSub } from './features/redis-pub-sub/chat.js';
import type { ExtendedWebSocket } from '../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { auth } from '../lucia';
import { Sync } from './features/offline/sync';

const FEATURE_STRATEGIES = {
	chat: {
		'redis-streams': ChatStreams,
		'redis-pub-sub': ChatPubSub
	},
	presence: {
		'redis-streams': PresenceStreams,
		'redis-pub-sub': PresencePubSub
	},
	offline: {
		sync: Sync
	}
};

type Feature = {
	type: keyof typeof FEATURE_STRATEGIES;
	strategy: keyof (typeof FEATURE_STRATEGIES)[keyof typeof FEATURE_STRATEGIES];
	stream: string;
	clientSiteId?: string;
	clientVersion?: number;
};

function getFeatureFor(
	type: keyof typeof FEATURE_STRATEGIES,
	strategy: keyof (typeof FEATURE_STRATEGIES)[keyof typeof FEATURE_STRATEGIES]
) {
	return FEATURE_STRATEGIES[type][strategy];
}

async function sessionFrom(request: IncomingMessage) {
	const sessionId = auth.readSessionCookie(request.headers.cookie);
	// note: `validateSession()` throws an error if session is invalid
	return sessionId ? await auth.validateSession(sessionId) : null;
}

export async function hooksConnectionHandler(ws: ExtendedWebSocket, request: IncomingMessage) {
	const session = await sessionFrom(request);
	if (session) {
		ws.session = session;
	} else {
		ws.close(1008, 'User not authenticated');
		return;
	}

	const url = new URL(`${request.headers.origin}${request.url}`);
	const features = url.searchParams.get('features');

	if (features === null) {
		ws.close(1008, 'CLOSING - No features specified');
		throw new Error('Invalid request - no features specified');
	}

	JSON.parse(features).forEach(async (feature: Feature) => {
		if (!feature.stream) {
			ws.close(1008, `No stream specified for ${feature.type}`);
			throw new Error(`Invalid feature ${feature.type} - no stream specified`);
		}
		const f = await getFeatureFor(feature.type, feature.strategy);
		await f.init({
			ws,
			stream: feature.stream,
			clientSiteId: feature.clientSiteId,
			clientVersion: feature.clientVersion
		});
	});
}
