var path = require('path')
var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')

const rootDir = path.join(__dirname, '..', 'public')

// Serve up public/ftp folder
var serve = serveStatic(rootDir, { index: ['index.html'] })

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res))
})

// Listen
var port = 3000
server.listen(port, () => {
  console.log(`serving static files from ${rootDir}`)
  console.log(`listening at http://localhost:${port}/`)
})
