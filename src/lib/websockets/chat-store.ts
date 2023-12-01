import { derived } from 'svelte/store';
import type { wsStore } from './ws-store';

export type Message = {
	id: string;
	message: string;
	type?: 'message' | 'disconnect' | 'connect';
	username?: string;
};

const attachListener =
	(initialValue: Message[]) => ($ws: WebSocket | null, set: (value: Message[]) => void) => {
		let listenerAdded = false;
		if ($ws && !listenerAdded) {
			let messages: Message[] = initialValue;
			const addMessage = (message: Message) => {
				messages = [...messages, message];
			};
			$ws.addEventListener('message', (event) => {
				listenerAdded = true;
				if (typeof event.data === 'string') {
					const data = JSON.parse(event.data);
					if (['message', 'connect', 'disconnect'].includes(data.type)) {
						addMessage(data);
						set(messages);
					}
				}
			});
		}
	};

// NOTE!!! In local dev, when you save this file, HMR removes the last few messages when reloading.
// that's because initialValue isn't updated from the server. Not a problem in prod
export function chatStore(ws: ReturnType<typeof wsStore>, initialValue: Message[]) {
	const messages = derived(ws, attachListener(initialValue), initialValue);

	return {
		subscribe: messages.subscribe,
		send(message: string) {
			if (!ws) {
				throw 'No websocket connection!';
			}
			ws.send(JSON.stringify({ type: 'chat', message }));
		}
	};
}
