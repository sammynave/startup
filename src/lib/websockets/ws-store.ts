import { browser } from '$app/environment';

type Subscription = (value: WebSocket | null) => void;

function open(url: string, subscriptions: Set<Subscription>) {
	const ws = new WebSocket(url);
	ws.addEventListener('error', (error) => console.error(error));
	ws.addEventListener('open', () => subscriptions.forEach((subscription) => subscription(ws)));
	return ws;
}

function close(ws: WebSocket | null, subscriptionsSize: number) {
	if (subscriptionsSize === 0 && ws !== null) {
		ws.close();
		return null;
	} else {
		return ws;
	}
}

export function wsStore({ url }: { url: string }) {
	const subscriptions = new Set<Subscription>();

	let ws: WebSocket | null = null;

	return {
		subscribe(subscription: Subscription) {
			let unsubscribe = () => undefined;
			if (browser) {
				ws = ws === null ? open(url, subscriptions) : ws;
				subscriptions.add(subscription);

				unsubscribe = () => {
					subscriptions.delete(subscription);
					ws = close(ws, subscriptions.size);
				};
			}

			return unsubscribe;
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
