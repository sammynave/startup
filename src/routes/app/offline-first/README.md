
Node Connects
1. Server sends request to catch up

```ts
// SYNC SERVER
// This is the server requesting to CATCH UP
// This can happen when the server receives a new connection


// Step 1. CLIENT INITIALIZES FLOW
// client sends up `siteId` as queryParm in ws URL
const [[siteId]] = await db.exec(`SELECT crsql_site_id()`)
new WebSocket(`wss://url:host/?siteId=${siteId}`)

// Step 2. SERVER RECEIVES CLIENT CONNECT
async function catchUpServer({clientSiteId}) {
	const [[versionOfClient]] = await db.exec(`SELECT db_version FROM crsql_tracked_peers WHERE site_id = ?`, [clientSiteId])
	const message = { type: 'catch up', version: versionOfClient };
	ws.send(JSON.stringify(message)
}
// Once server has client's siteId
await catchUpServer({clientSiteId: message.siteId})


// on client
// receive { type: 'catch up', version }
if (message.type === 'catch up') {
	const versionFromServer = message.version;
	// Pull all changes made by client since version
	const changes =
		return await db.exec(`SELECT * FROM crsql_changes WHERE db_version > ? AND site_id = crsql_site_id()`, [versionFromServer]);
	})
	const message = { type: 'update', changes }
	ws.send(JSON.stringify(message))
}
// on server
// typical upate handler used to merge changes and update tracked peers




// SYNC CLIENT
// Server opens websocket then triggers this Flow
ws.send({ type:'connected' })


// Client receives message
if (message.type === 'connected') {
	const clientTrackedPeers = await db.execO(`SELECT site_id, db_version FROM crsql_tracked_peers`)
	const message = { type: 'catch up', peers: clientTrackedPeers }
	ws.send(JSON.stringify(message))
}


// on server
// This is the server fulfilling the client's request to CATCH UP
async function catchUpClient(clientTrackedPeers) {
	const changes = clientTrackedPeers.flatMap(async ({db_version, site_id}) => {
		return await db.exec(`SELECT * FROM crsql_changes WHERE db_version = ? AND site_id = ?`, [db_version, site_id]);
	})
	const message = { type: 'update', changes }
	ws.send(JSON.stringify(message))
}
if (message.type === 'catch up') {
	await catchUpClient(message.peers)
}
```
