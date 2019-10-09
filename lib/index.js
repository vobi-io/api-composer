'use strict'

const ApiResponse = require('./api-response')
const ApiComposer = require('./api-extended')
const mergeApis = require('./merge-apis')
const Resolver = require('./resolvers/resolver')
const Policy = require('./resolvers/policy')

module.exports = {
  ApiComposer,
  ApiResponse,
  mergeApis,
  Resolver,
  Policy
}
