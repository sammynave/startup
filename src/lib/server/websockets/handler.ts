import type { IncomingMessage } from 'http';
import { Presence as PresenceStreams } from './features/redis-streams/presence';
import { Presence as PresencePubSub } from './features/redis-pub-sub/presence';
import { Chat as ChatStreams } from './features/redis-streams/chat.js';
import { Chat as ChatPubSub } from './features/redis-pub-sub/chat.js';
import { sessionFrom } from './request-utils.js';
import type { ExtendedWebSocket } from '../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';

const FEATURE_STRATEGIES = {
	chat: {
		'redis-streams': ChatStreams,
		'redis-pub-sub': ChatPubSub
	},
	presence: {
		'redis-streams': PresenceStreams,
		'redis-pub-sub': PresencePubSub
	}
};

type Feature = {
	type: keyof typeof FEATURE_STRATEGIES;
	strategy: keyof (typeof FEATURE_STRATEGIES)[keyof typeof FEATURE_STRATEGIES];
	stream: string;
};

function getFeatureFor(
	type: keyof typeof FEATURE_STRATEGIES,
	strategy: keyof (typeof FEATURE_STRATEGIES)[keyof typeof FEATURE_STRATEGIES]
) {
	return FEATURE_STRATEGIES[type][strategy];
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
		console.error('NO FEATURES');
		return;
	}

	JSON.parse(features).forEach(async (feature: Feature) => {
		if (!feature.stream) {
			console.log('CLOSING - no stream');
			ws.close(1008, `No channel specified for ${feature.type}`);
			return;
		}

		const f = getFeatureFor(feature.type, feature.strategy);
		await f.init({ ws, channel: feature.stream });
	});
}
