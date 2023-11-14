import { derived } from 'svelte/store';
import type { wsStore } from './ws-store';

export type Message = {
	message: string;
	type?: 'message' | 'disconnect' | 'connect';
	username?: string;
};
export function chatStore(ws: ReturnType<typeof wsStore>, initialValue: Message[]) {
	const messages = derived(
		ws,
		($ws, set) => {
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
		},
		initialValue
	);

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
