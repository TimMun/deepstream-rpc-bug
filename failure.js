/**
 * This is a reproduction scenario for https://github.com/deepstreamIO/deepstream.io/issues/1001
 * 
 */

var deepstreamClient = require("@deepstream/client")
var { Deepstream } = require('@deepstream/server')

// serverA and serverB are clustered by @deepstream/clusternode-redis
// serverA on port 6020
const serverA = new Deepstream('./config/ds-config1.yml')

// serverB on port 6021
const serverB = new Deepstream('./config/ds-config2.yml')

// clientA to connect to serverA
const clientA = deepstreamClient('localhost:6020')

// clientB to connect to serverB
const clientB = deepstreamClient('localhost:6021')


serverA.start()

serverA.on("started", () => {

  clientA.login({ username: 'clientA' }, () => {

    clientA.rpc.provide("test-rpc", (data, response) => {
      console.log("ClientA: test-rpc request successfully received")
      response.send({})
    })

    clientA.event.subscribe("test-event", () => {
      console.log("ClientA: successfully received test-event")
    })

    /**
     * This timeout simulates a second server node (serverB) joining the cluster, after clientA
     * has already provided test-rpc on serverA. The bug seems to be that serverB doesn't request the 
     * state registries of the existant nodes in the cluster; so when clientB makes the rpc, serverB
     * doesn't route it to clientA, instead it responds with NO_RPC_PROVIDER.

      Note that if you make the timeout small (~50ms on my pc), the error doesn't
      occur because the rpc provide is registered after serverB joins the cluster.

      Strangely enough, events seem to work; test-event will be received by clientA.
     */

    setTimeout(() => {
      serverB.start()

      serverB.on("started", () => {
        clientB.login({ username: 'clientB' }, () => {
          // event will be received by clientA
          clientB.event.emit("test-event") 

          // The test-rpc will fail with "NO_RPC_PROVIDER"
          clientB.rpc.make("test-rpc", {}, (err, result) => {
            if (err) {
              console.log("test-rpc failure, err = " + err)
            } else {
              console.log("ClientB: test-rpc response successfully received")
            }
          })
        })
      })
    }, 5000)
  })
})