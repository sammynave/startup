import { derived } from 'svelte/store';
import type { wsPubSubStore } from './ws-store';

export function reloadStore(ws: ReturnType<typeof wsPubSubStore>) {
	return derived(ws, ($ws) => {
		let listenerAdded = false;
		if ($ws && !listenerAdded) {
			$ws.addEventListener('message', (event) => {
				listenerAdded = true;
				if (typeof event.data === 'string') {
					const data = JSON.parse(event.data);
					if (data.type === 'reload') {
						console.log('reloading');
						window.location.reload();
					}
				}
			});
		}
	});
}
