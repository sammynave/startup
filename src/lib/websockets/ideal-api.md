# Client

```ts
const stream = 'room:general'
const ws = wsStore({stream, implementation})
const chat = chatStore(ws, data.messages)
const presence = presenceStore(ws, data.presentUsers)
```



```ts
// ws-store.ts
export function wsStore({ stream }) {
	const { protocol, host } = $page.url;
	const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${wsProtocol}//${host}/ws?stream=${stream}&implementation=${implementation}`
  // ...
  return {
    subscribe(subscription: Subscription) {
      // ...
    },
    send(message: string, type: string) {
      // ..
    }
  }
}
```

```ts
export const connectionHandler =
	(wss: ExtendedWebSocketServer) => async (ws: ExtendedWebSocket, request: IncomingMessage) => {
    let implementation;
		const params = searchParamsFrom(request);

		if (!params.channel) {
			ws.close(1008, 'No channel specified');
			return;
		}

		if (!params.implementation) {
      console.log('No implementation specified, defaulting to pub-sub')
      implementation = 'pub-sub'
    }

}
```
