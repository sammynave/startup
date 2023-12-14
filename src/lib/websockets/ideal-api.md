# ARCHITECTURE NOTES/IDEAS

- Can background worker be started in a vite plugin rather than `hooks.server.ts`?
  - maybe even don't load any routes/server any http traffic
  - just have the worker processes spawn
  - do we need to `register` the workers on `globalThis` like the websocket server?
- Key pieces of integrated websocket
  - vite plugin
    - create web socket server
      - adds listeners for global `connection` and `close` events.
      - assigns a `socketId` to websocket connections
      - saves assigns created web server to `globalThis`
    - handle the http upgrade to websocket and host server on specified endpoint (ex. `/websocket`)
      - `emits` connection event
  - `hooks.server.ts`
    - initializes wss `connectionHandler` to the wss `connection` event
    - handles weirdness with HMR - removes wss event listeners and `wss.clients`
  - `connection-handler.ts`
    - initializes specified `clients` (NOTE: maybe call these `plugins`?). (e.g. `chat`, `presence`, `notifications`, etc...)
    - NOTE: it would be nice to support custom `clients` here.
      - need to settle on a contract
      - maybe an object/class with specific methods (e.g. `init`, `open`, `message`, `close`, etc...)
    - passes context to each `client`
      - `wss`
      - `ws`
      - `client` args
        - `name`
        - `stream`
        - `strategy`
  - Clients (e.g. `chat-client.ts`)
    - responsible for hooking into ws events (e.g. `message`, `open`, `close`) NOTE: "hooking into `open` isn't `ws.on('open')` since we're in the `open` event when initializing the client.
    - hooking into global Redis listener (for `streams` strategy)
    - examples for chat with pub/sub strategy
      - `pub`
        - `open` => publish a `user X joined` message
        - `close` => publish a `user x left` message
        - `message` => create message, push to stream, publish message recieved event
      - `sub`
        - on `message` published, notifify all the clients subscribed to this stream on this `wss`
  - Listener (`streams` strategy only)
    - basically manages all of the code needed to support `xread` blocking and reading from multiple streams
    - adding/removing consumers (a.k.a clients like `chat` or `presence`)
  - Redis clients
    - probably need 3 clients:
      - one publisher/generic uses (`xadd`, `lpush`, `xrange`, `hset`, `hgetall`, etc...)
      - one subscriber (NOTE: once a client becomes a subscriber, it can no longer send other types of commands)
      - one for blocking operations like `xread` in the `streams` strategy

# TODO

- start refactoring/redesigning some of this to match the notes above.
- map out what is public and what is private.
- start thinking about this as a npm package that can be installed.

# Client

stream naming convention: `object-type:id:field` (e.x. `stream:123:presence` or `stream:123:chat` or `stream:123:thread:345:chat`)

```ts
// some.svelte file
const chat = new Chat({strategy: 'streams'})
const presence = new Presence({ strategy: 'pub-sub'})
const notifications = new Notifications({strategy: 'pub-sub'})
const ws = wsStore({ stream: 'stream:123', clients: [chat, presence, notifications] });

// ... later

{#if notifications}
  <Notifications {notifications}>
{/if}

// list online active users
{#each presence.users as |user|}
  <Avatar {user.id} />
{/each}

{#each chat.messages as |message|}
  <Message {message.id} />
{/each}

// send a chat message
<input  bind:value={message} />
<button on:click={() => chat.send(message)}>send</button>
```

```ts
// ws-store.ts
export function wsStore({ clients }) {
	const { protocol, host } = $page.url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
	const url = `${wsProtocol}//${host}/ws?clients=${clients.map(({ name, strategy, stream }) => ({
		name,
		strategy,
		stream
	}))}`;

	// ...

	const api = {
		subscribe(subscription: Subscription) {
			// ...
		},
		send(message: string, type: string) {
			// ..
		}
	};
	clients.forEach((client) => {
		client.listen(ws);
		api[client.name] = client.api;
	});

	return api;
}
```

```ts
// ws-features/chat.ts
class Chat {
	constructor({ strategy }) {
		this.strategy = strategy;
	}
}
```

# Server

```ts
export const connectionHandler =
	(wss: ExtendedWebSocketServer) => async (ws: ExtendedWebSocket, request: IncomingMessage) => {
		const { clients } = paramsFrom(request);

		if (clients.length === 0) {
			ws.close(1008, 'No clients specified');
			return;
		}

		// check session is valid here

		// Register plugins
		clients.forEach(({ name, stream, strategy = 'pub-sub' }) => {
			if (!strategy) {
				console.warn(`No strategy specified for client ${name}. Defaulting to pub-sub`);
			}

			if (!stream) {
				console.error(`Can not initialize client ${name}, no stream specified.`);
				continue;
			}

			Handlers[name].init({ stream, strategy, ws, wss });
		});
	};
```
