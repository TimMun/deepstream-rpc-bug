/**
 * Repro case for https://github.com/deepstreamIO/deepstream.io-client-js/issues/510
 * 
 * This case simulates a dataProvider that subscribes to presence changes for a testUser when he logs in (in the auth server).
 * testUser logs in on two different clients using the same username.
 */

var deepstreamClient = require("@deepstream/client")
var { Deepstream } = require('@deepstream/server')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()


// serverA on port 6020
const serverA = new Deepstream('./config/ds-config1.yml')

const dataProvider = deepstreamClient('localhost:6020')

const clientA = deepstreamClient('localhost:6020')
const clientB = deepstreamClient('localhost:6020')

serverA.start()

serverA.on("started", () => {

  dataProvider.login({ username: 'dataProvider' }, () => {

    // testUser logs in on first client
    setTimeout(() => { clientA.login({ username: 'testUser' }) }, 2000 )

    // testUser logs in on second client
    setTimeout(() => { clientB.login({ username: 'testUser' }) }, 4000)

    // testUser shuts down both clients. dataProvider will then error out.
    setTimeout(() => { 
      clientA.close()
      clientB.close()
    }, 8000)
  })
})

/**
 * Auth Server
 * 
 * dataProvider subscribes to presence changes once user logs in
 */
app.use(bodyParser.json())

app.post('/auth-user', (req, res) => {
  if (req.body.authData.username) {
    res.json({
      username: req.body.authData.username,
    })

    // dataProvider subscribes to presence change if this is testUser
    if (req.body.authData.username === 'testUser') {
      console.log("Subscribing to presence change for testUser")
      dataProvider.presence.subscribe('testUser', onPresenceChange)
    }

  } else {
    res.status(403).send('Invalid Credentials')
  }
})

app.listen(3000)



var onPresenceChange = (username, active) => {
  console.log("Presence changed: ", username, active)
  if (!active) {
    dataProvider.presence.unsubscribe(username, onPresenceChange)
  }
}



