'use strict'

const {
  TypeComposer,
  schemaComposer
} = require('graphql-compose')

const API = require('../../api')

API.macro('typeFromString', function(typeStr) {
  const type = TypeComposer.schemaComposer.getOrCreateTC(typeStr)
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  this._graphqlTypes.push(type)
  return type
})

API.macro('createType', function(name, fields) {
  const type = TypeComposer.create({ name, fields })
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  schemaComposer.set(name, type)
  this._graphqlTypes.push(type)
  return type
})

API.macro('createTypes', function(types) {
  Object.keys(types).forEach(name => {
    this.createType(name, types[name])
  })
  return this
})

API.macro('getFieldType', function(name) {
  return TypeComposer.schemaComposer
    .getTC(this._defaultType)
    .getFieldType(name)
    .name
})

API.macro('mutationOf', function(tcName, name) {
  const [type, method] = tcName.split('.')
  const tc = TypeComposer.schemaComposer.getTC(type)
  const res = tc.getResolver(method)
  return this.add({
    name,
    kind: 'mutation',
    args: res.getArgs(),
    type: res.getTypeComposer(),
    resolve: res.getResolve()
  })
})

module.exports = API
