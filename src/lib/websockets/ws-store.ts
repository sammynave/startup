import { browser } from '$app/environment';

type Subscription = (value: WebSocket | null) => void;

function open({
	url,
	ws,
	subscriptions
}: {
	url: string;
	ws: WebSocket | null;
	subscriptions: Set<Subscription>;
}) {
	if (!ws) {
		ws = new WebSocket(url);
		ws.addEventListener('error', (error) => console.error(error));
		ws.addEventListener('open', () => subscriptions.forEach((subscription) => subscription(ws)));
	}
	return ws;
}

function close({ ws, noSubscriptions }: { ws: WebSocket | null; noSubscriptions: boolean }) {
	if (ws && noSubscriptions) {
		ws.close();
		ws = null;
	}
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

			ws = open({ url, ws, subscriptions });
			subscriptions.add(subscription);
			return () => {
				subscriptions.delete(subscription);
				ws = close({ ws, noSubscriptions: subscriptions.size === 0 });
			};
		},

		// Generic send, can be customized/extended from custom store
		// see `send` in `chat-store` for example
		send(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
			ws?.send(message);
		}
	};
}
