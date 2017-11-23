const path = require('path')
const watchman = require('fb-watchman')
const Metalsmith = require('metalsmith')

const processCss = require('./postcss')

const dir_of_interest = path.join(__dirname, '..')
const ignore = [
  /^node_modules/,
  /^public/,
  /^build/,
  /^\./
]

// initialize metalsmith
const config = require(path.join(__dirname, '../metalsmith.json'))
const builder = Metalsmith(path.join(__dirname, '..'))

// load metalsmith config options
Object.keys(config).forEach(key => {
  if (key === 'plugins') {
    return
  }
  builder[key](config[key])
})

// load metalsmith plugins
Object.keys(config.plugins).forEach(key => {
  var args = config.plugins[key]
  var plugin = require(key)
  builder.use(plugin(args))
})

let _cachedCSS

const builders = {
  js: (inlineCSS) => {
    if (inlineCSS) {
      _cachedCSS = inlineCSS
    }
    builder
      .metadata({ inlineCSS: inlineCSS || _cachedCSS })
      .build(function(err) {
        if (err) throw err
        console.log('JS: Build finished!')
      })
  },
  css: () => processCss()
    .then((result) => {
      console.log('CSS: Build finished!')
      return result
    })
}

// `watch` is obtained from `resp.watch` in the `watch-project` response.
// `relative_path` is obtained from `resp.relative_path` in the
// `watch-project` response.
function make_subscription(client, watch, relative_path) {
  client.command(
    ['clock', watch],
    function (error, resp) {
      if (error) {
        console.error('Failed to query clock:', error);
        return;
      }

      sub = {
        // Match any `.js` file in the dir_of_interest
        expression: ["allof", ["match", "*.*"]],
        // Which fields we're interested in
        fields: ["name", "size", "mtime_ms", "exists", "type"],
        since: resp.clock
      }

      if (relative_path) {
        sub.relative_root = relative_path;
      }

      client.command(
        ['subscribe', watch, 'mysubscription', sub],
        function (error, resp) {
          if (error) {
            // Probably an error in the subscription criteria
            console.error('failed to subscribe: ', error);
            return;
          }
          // console.log('subscription ' + resp.subscribe + ' established');
        }
      )

      // Subscription results are emitted via the subscription event.
      // Note that this emits for all subscriptions.  If you have
      // subscriptions with different `fields` you will need to check
      // the subscription name and handle the differing data accordingly.
      // `resp`  looks like this in practice:
      //
      // { root: '/private/tmp/foo',
      //   subscription: 'mysubscription',
      //   files: [ { name: 'node_modules/fb-watchman/index.js',
      //       size: 4768,
      //       exists: true,
      //       type: 'f' } ] }
      client.on(
        'subscription',
        function (resp) {
          if (resp.subscription !== 'mysubscription') return;

          var files = resp.files.filter(
            file => !ignore.some(pattern => pattern.exec(file.name))
          )

          files.forEach(function (file) {
            // convert Int64 instance to javascript integer
            const mtime_ms = +file.mtime_ms;

            console.log('file changed: ' + file.name, mtime_ms);
          })

          if (!files.length) {
            return
          }

          // build site using builders
          if (files.some(file => file.name.match(/\.css$/))) {
            console.log('re-building css and js...')
            return buildAll()
          } else {
            console.log('re-building js...')
            builders.js()
          }
        }
      )
    }
  )
}

function watchAndRebuild(client) {
  return (error, resp) => {
    if (error) {
      console.error('Error initiating watch:', error)
      return
    }

    // It is considered to be best practice to show any 'warning' or
    // 'error' information to the user, as it may suggest steps
    // for remediation
    if ('warning' in resp) {
      console.log('warning: ', resp.warning)
    }

    // `watch-project` can consolidate the watch for your
    // dir_of_interest with another watch at a higher level in the
    // tree, so it is very important to record the `relative_path`
    // returned in resp

    console.log(
      'watch established on ',
      resp.watch,
      ' relative_path',
      resp.relative_path || '-none-'
    )

    make_subscription(client, resp.watch, resp.relative_path)
  }
}

function buildAll() {
  builders.css().then((cssResult) => {
    builders.js(cssResult)
  })
}

function watch() {
  const client = new watchman.Client()
  client.capabilityCheck(
    { optional:[], required: ['relative_root'] },
    function (error, resp) {
      if (error) {
        console.log(error)
        client.end()
        return
      }

      // Initiate the watch
      client.command(['watch-project', dir_of_interest], watchAndRebuild(client))

      // build site using metalsmith
      buildAll()
    }
  )
}

// handle direct invokation
const [ , scriptName ] = process.argv
if (scriptName && new RegExp(__filename).exec(scriptName)) {
  buildAll()
}

module.exports = watch
