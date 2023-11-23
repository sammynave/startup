# Client

stream naming convention: `object-type:id:field` (e.x. `channel:123:presence` or `channel:123:chat` or `channel:123:thread:345:chat`)

```ts
// some.svelte file
const chat = new Chat({strategy: 'streams'})
const presence = new Presence({ strategy: 'pub-sub'})
const notifications = new Notifications({strategy: 'pub-sub'})
const ws = wsStore({ stream: 'channel:123', clients: [chat, presence, notifications] });

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
export function wsStore({ stream, clients }) {
	const { protocol, host } = $page.url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${wsProtocol}//${host}/ws?stream=${stream}&clients=${clients.map(({name, strategy}) => ({ name, strategy }))}`
  // /ws?stream=channel:123&
  // ...

  const api = {
    subscribe(subscription: Subscription) {
      // ...
    },
    send(message: string, type: string) {
      // ..
    },
  }
  clients.forEach((client) => {
    client.listen(ws)
    api[client.name] = client.api
  })

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
		const { stream, clients } = paramsFrom(request);

		if (!stream) {
			ws.close(1008, 'No stream specified');
			return;
		}
		if (clients.length === 0) {
			ws.close(1008, 'No clients specified');
			return;
		}
    clients.forEach((client) => {
      Handlers[client].init()
    }) 
    // check session

    ws.on('message', async (data: string) => {
      // ex. data.type === 'chat'
      Handlers[data.type]
    })

}
```
