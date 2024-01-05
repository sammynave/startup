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
