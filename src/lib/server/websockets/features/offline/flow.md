# Flow

## Server

1. WS connection established
2. Server gets clientSiteId from URL
3. Server queries `crsql_tracked_peers` for clientSite version
4. Server queries all changes >= tracked client version
5. Server sends `update` with changes
  1. Client receives `update`
  2. Client merges changes
  3. Client updates server version in `crsql_tracked_peers`
6. Server updates client version in `crsql_tracked_peers`

## Client

1. WS connection established
2. Server sends down `connected` message with server siteId
2. Client queries `crsql_tracked_peers` for serverSite version
3. Client queries all changes >= tracked server version
4. Client sends `update` with changes
  1. Server receives `update` 
  2. Server merges changes
  3. Server updates client version in `crsql_tracked_peers`
  4. Server gets all tracked peers with version <= server
  5. Server loops through clients
    1. Server queries all changes >= tracked client version
    2. Server sends `update` with changes to client
    3. Server updates client version in `crsql_tracked_peers`
5. Client updates server version in `crsql_tracked_peers`

