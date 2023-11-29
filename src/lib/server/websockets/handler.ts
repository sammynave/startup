import type { IncomingMessage } from 'http';
import { PresenceStreams } from './features/presence-streams';
import { ChatStreams } from './features/chat-streams.js';
import { sessionFrom } from './request-utils.js';
import { ChatPubSub } from './features/chat-pub-sub.js';
import type {
	ExtendedWebSocket,
	ExtendedWebSocketServer
} from '../../../../vite-plugins/vite-plugin-svelte-kit-integrated-websocket-server';
import { PresencePubSub } from './features/presence-pub-sub';

const FEATURE_STRATEGIES = {
	chat: {
		'redis-streams': ChatStreams,
		'redis-pubsub': ChatPubSub
	},
	presence: {
		'redis-streams': PresenceStreams,
		'redis-pubsub': PresencePubSub
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

export function connectionHandler(wss: ExtendedWebSocketServer) {
	return async function hooksConnectionHandler(ws: ExtendedWebSocket, request: IncomingMessage) {
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
			await f.init({ ws, wss, channel: feature.stream, username: session.user.username });
		});
	};
}
