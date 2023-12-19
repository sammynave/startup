import initWasm from '@vlcn.io/crsqlite-wasm';
import wasmUrl from '@vlcn.io/crsqlite-wasm/crsqlite.wasm?url';

export async function load(file = 'default.db', paths: { wasm?: string } = {}) {
	const sqlite = await initWasm(() => paths?.wasm || wasmUrl);
	const db = await sqlite.open(file);
	return { db, browser: true };
}
