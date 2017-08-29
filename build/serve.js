const path = require('path')
const finalhandler = require('finalhandler')
const http = require('http')
const serveStatic = require('serve-static')

const rootDir = path.join(__dirname, '..', 'public')

function serve() {
  // Create server
  const server = http.createServer(function onRequest (req, res) {
    // Serve up public/ftp folder
    const staticServe = serveStatic(rootDir, { index: ['index.html'] })
    staticServe(req, res, finalhandler(req, res))
  })

  // Listen
  const port = 3000
  server.listen(port, () => {
    console.log(`serving static files from ${rootDir}`)
    console.log(`listening at http://localhost:${port}/`)
  })
}

// handle direct invokation
const [ , scriptName ] = process.argv
if (scriptName && new RegExp(__filename).exec(scriptName)) {
  serve()
}

module.exports = serve
