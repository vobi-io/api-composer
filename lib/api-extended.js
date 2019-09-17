'use strict'

const path = require('path')
const API = require('./api')

const plugins = ['graphql', 'express', 'koa', 'swagger']

const pluginPath =
  pluginName =>
    path.resolve(__dirname, 'plugins', pluginName, 'api')

const ExtendedAPI =
  plugins
    .reduce(
      (API, pluginName) => {
        API = require(pluginPath(pluginName))
        return API
      },
      API
    )

module.exports = ExtendedAPI
