import { browser } from '$app/environment';

type Subscription = (value: WebSocket | null) => void;

function open(url: string, subscriptions: Set<Subscription>) {
	const ws = new WebSocket(url);
	ws.addEventListener('error', (error) => console.error(error));
	ws.addEventListener('open', () => subscriptions.forEach((subscription) => subscription(ws)));
	return ws;
}

export function wsStore({ url }: { url: string }) {
	const subscriptions = new Set<Subscription>();

	let ws: WebSocket | null = null;

	return {
		subscribe(subscription: Subscription) {
			if (!browser) {
				return () => undefined;
			}

			ws = ws === null ? open(url, subscriptions) : ws;
			subscriptions.add(subscription);

			return () => {
				subscriptions.delete(subscription);
				if (subscriptions.size === 0 && ws !== null) {
					ws.close();
					ws = null;
				}
			};
		},

		// Generic send, can be customized/extended from custom store
		// see `send` in `chat-store` for example
		send(message: string) {
			if (!ws) {
				throw 'No websocket connection!';
			}

			ws.send(message);
		}
	};
}
