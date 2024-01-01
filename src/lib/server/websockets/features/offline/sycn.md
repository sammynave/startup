# Concerns

1. websocket client (ws)
  a. receive message
  b. send message
2. interacting with other websocket clients (redis)
  a. broadcasting messages to other clients
  b. receiving messages from other clients
3. dealing with database changes
  a. merging changes from clients
  b. broadcasting changes to clients
  c. catching server up with clients (ex: offline changes happened on client)
  d. catching clients up with server (ex: new client)
