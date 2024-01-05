# Context

App wide

1. totally offline, no server.
   1. sync with another window/tab
2. online/offline, syncing with server.
   1. sync with another window/tab
   2. sync with other devices

Within App

1. One DB connection shared across components
   1. If Component A updates Table A, then any component that is watching Table A, should also update their own view of the table
2. One WS connection shared across components
3. One BroadcastChannel shared across components


Within Component
1. subscribe to multiple `view`s that are automatically refreshed when that is being `watched` is updated.


# Flows

Init

1. client connects to server
2. client announces presence
3. server sends all changes to client (since last version)
4. server updates tracked version of client
5. client merges changes
6. client updates tracked version of server
7. client sends all changes to server (since last version)
8. client updates tracked version of server
10. server merges changes
11. server updates tracked version of client

Client connected and caught up

1. user makes change
2. client sends all changes to server (since last version)


Offline to Online (TO BE IMPLEMENTED)

1. should be similar if not the same as Init flow
