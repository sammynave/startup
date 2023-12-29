# Architecture

## Server

- ws-server.ts - websocket server
- websockets/handler.ts
  - auth/session
  - "feature" initializtion (chat, presence, offline sync...)
- features/offline/sync.ts
  - WS handlers
  - Redis pub/sub (could also be Redis stream? maybe make this an adapter)
  - Database interactions
  - Sync logic
- +page.server.ts
  - construct wss url + features
  - lookup/construct `dbName` for logged in user.


## Client

- +page.svelte
  - hook into store and react to changes
  - render whatever comes back from store
  - handle interactions - UI CRUD
- sync-db.ts
  - initialize WASM sqlite
  - open db
  - load schema
  - provide useful methods related to syncing
    - `.merge`
    - `.version`
    - `.siteId`
    - NOTE: can probably move some of the queries in `/features/offline/sync.ts` and `sync-db-store.ts` to this class
  - provides reference to `db` to query
- sync-db-store.ts
  - method for pulling `latestVersion` out of array of `changes`
  - establish WS connection
  - add WS listener
  - initiate WASM db load
  - returns `store` with bound lookup methods and reactive query
  - handles WS message types/syncing logic

# TODO

- [ ] keep alive for WS connection
- [ ] move heavy lifting to web worker
- [ ] cache layer?
- [ ] make network layer an adapter. websocket/REST/SSE/webrtc?/etc...
- [ ] error handling/change rejection
- [ ] handle websocket buffer full - not sure what max message size is but make sure
- [ ] websocket compression?
- [ ] nodejs streams api?
