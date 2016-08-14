#!/usr/bin/env node

// Based on
// https://github.com/gaearon/react-transform-boilerplate/blob/master/devServer.js

var fs = require('fs')
var path = require('path')
var express = require('express')
var webpack = require('webpack')
var assign = require('lodash.assign')
var compress = require('compression')
var httpProxyMiddleware = require('http-proxy-middleware')
var Dashboard = require('webpack-dashboard')
var DashboardPlugin = require('webpack-dashboard/plugin')

var configFile = process.argv[2] || 'webpack.config.js'
var config
try {
  config = require(path.join(process.cwd(), configFile))
} catch (e) {
  console.error(e.stack)
  console.error(
    'Failed to load webpack config, please use like this\n' +
    'hjs-dev-server.js webpack.config.js\n'
  )
  process.exit(1)
}

var serverConfig = config.devServer
var https = serverConfig.https
var app = express()

var createServer = require(https ? 'https' : 'http').createServer
var server

if (serverConfig.compress) {
  app.use(compress())
}

if (https) {
  var httpsConfig = {
    key: fs.readFileSync(path.resolve(__dirname, '../resources/hjs-webpack-localhost.key')),
    cert: fs.readFileSync(path.resolve(__dirname, '../resources/hjs-webpack-localhost.crt'))
  }

  if (typeof https === 'object') {
    assign(httpsConfig, https)
  }

  server = createServer(httpsConfig, app)
} else {
  server = createServer(app)
}

var compiler = webpack(config)

var dashboard = new Dashboard()

compiler.apply(new DashboardPlugin(dashboard.setData))

if (serverConfig.proxy) {
  if (!Array.isArray(serverConfig.proxy)) {
    serverConfig.proxy = [serverConfig.proxy]
  }
  serverConfig.proxy.forEach(function (proxyConfig) {
    var proxy = httpProxyMiddleware(proxyConfig.context, proxyConfig.options)
    app.use(function (req, res, next) {
      next()
    }, proxy)
  })
}

if (serverConfig.historyApiFallback) {
  app.use(require('connect-history-api-fallback')({
    verbose: false
  }))
}

serverConfig.quiet = true
serverConfig.publicPath = config.output.publicPath

app.use(require('webpack-dev-middleware')(compiler, serverConfig))

if (serverConfig.hot) {
  app.use(require('webpack-hot-middleware')(compiler, {
    log: () => {}
  }))
}

if (serverConfig.contentBase) {
  app.use(express.static(serverConfig.contentBase))
}

server.listen(serverConfig.port, serverConfig.hostname, function (err) {
  if (err) {
    console.error(err)
    return
  }

  var protocol = https ? 'https' : 'http'
  console.log('Listening at ' + protocol + '://' + serverConfig.hostname + ':' + serverConfig.port)
})
