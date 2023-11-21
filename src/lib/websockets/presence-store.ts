import { derived } from 'svelte/store';
import type { wsStore } from './ws-store';

export function presenceStore(ws: ReturnType<typeof wsStore>, initialValue: string[]) {
	return derived(
		ws,
		($ws, set) => {
			let listenerAdded = false;
			if ($ws && !listenerAdded) {
				$ws.addEventListener('message', (event) => {
					listenerAdded = true;
					if (typeof event.data === 'string') {
						const data = JSON.parse(event.data);
						if (data.type === 'presence') {
							set(data.message);
						}
					}
				});
			}
		},
		initialValue
	);
}
