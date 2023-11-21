import { browser } from '$app/environment';

type Subscription = (value: WebSocket | null) => void;
export function wsStore({ url }: { url: string }) {
	const subscriptions = new Set<Subscription>();

	let ws: WebSocket | null = null;

	function open() {
		if (ws) {
			return;
		}
		ws = new WebSocket(url);
		ws.addEventListener('error', (error) => console.error(error));
		ws.addEventListener('open', () => subscriptions.forEach((subscription) => subscription(ws)));
	}

	function close() {
		if (ws) {
			ws.close();
			ws = null;
		}
	}

	return {
		subscribe(subscription: Subscription) {
			if (browser) {
				open();
			}
			subscriptions.add(subscription);
			return () => {
				subscriptions.delete(subscription);
				if (subscriptions.size === 0) {
					close();
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
