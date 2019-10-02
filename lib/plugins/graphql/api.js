'use strict'

const {
  InputTypeComposer,
  ObjectTypeComposer,
  EnumTypeComposer,
  schemaComposer
} = require('graphql-compose')
const { composeWithMongoose } = require('graphql-compose-mongoose/node8')

const API = require('../../api')

API.macro('getType', function(name) {
  return schemaComposer.getAnyTC(name)
})

API.macro('typesFromMongooseModels', function(models) {
  models.forEach(model => {
    const type = composeWithMongoose(model, {})
    if (!this._graphqlTypes) {
      this._graphqlTypes = []
    }
    this._graphqlTypes.push(type)
  })
  return this
})

API.macro('typeFromMongooseModel', function(model) {
  const type = composeWithMongoose(model, {})
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  this._graphqlTypes.push(type)
  return type
})

API.macro('typesFromStrings', function(typeStrs) {
  typeStrs.forEach(typeStr => {
    const type = schemaComposer.getOrCreateOTC(typeStr)
    if (!this._graphqlTypes) {
      this._graphqlTypes = []
    }
    this._graphqlTypes.push(type)
  })
  return this
})

API.macro('typeFromString', function(typeStr) {
  const type = schemaComposer.getOrCreateOTC(typeStr)
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  this._graphqlTypes.push(type)
  return type
})

API.macro('inputTypesFromStrings', function(typeStrs) {
  typeStrs.forEach(typeStr => {
    const type = InputTypeComposer.create(typeStr, schemaComposer)
    if (!this._graphqlTypes) {
      this._graphqlTypes = []
    }
    this._graphqlTypes.push(type)
  })
  return this
})

API.macro('inputTypeFromString', function(typeStr) {
  const type = InputTypeComposer.create(typeStr, schemaComposer)
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  this._graphqlTypes.push(type)
  return type
})

API.macro('createType', function(name, fields) {
  const type = ObjectTypeComposer.create({ name, fields }, schemaComposer)
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  schemaComposer.set(name, type)
  this._graphqlTypes.push(type)
  return type
})

API.macro('createInputType', function(name, fields) {
  const type = InputTypeComposer.create({ name, fields }, schemaComposer)
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  schemaComposer.set(name, type)
  this._graphqlTypes.push(type)
  return type
})

API.macro('createEnumType', function(name, values) {
  const type = EnumTypeComposer.create({ name, values }, schemaComposer)
  // schemaComposer.createEnumTC({ ngetTCame, values })
  if (!this._graphqlTypes) {
    this._graphqlTypes = []
  }
  // schemaComposer.set(name, type)
  this._graphqlTypes.push(type)
  return type
})

API.macro('createTypes', function(types) {
  Object.keys(types).forEach(name => {
    this.createType(name, types[name])
  })
  return this
})

API.macro('createEnumTypes', function(types) {
  Object.keys(types).forEach(name => {
    this.createEnumType(name, types[name])
  })
  return this
})

API.macro('getFieldType', function(name) {
  return schemaComposer
    .getAnyTC(this._defaultType)
    .getFieldType(name)
    .name
})

API.macro('getGqlType', function(name) {
  return schemaComposer
    .getAnyTC(name)
})

API.macro('getGqlResolver', function(tcName) {
  const [type, method] = tcName.split('.')
  const tc = schemaComposer.getAnyTC(type)
  const res = tc.getResolver(method)
  return res
})

API.macro('getQuery', function(name) {
  return this._resolvers.get(name)
})

API.macro('queryOf', function(tcName, name) {
  const [type, method] = tcName.split('.')
  const tc = schemaComposer.getAnyTC(type)
  const res = tc.getResolver(method)
  return this.add({
    name,
    kind: 'query',
    args: res.getArgs(),
    type: res.getType(),
    resolve: res.getResolve()
  })
})

API.macro('mutationOf', function(tcName, name) {
  const [type, method] = tcName.split('.')
  const tc = schemaComposer.getAnyTC(type)
  const res = tc.getResolver(method)
  return this.add({
    name,
    kind: 'mutation',
    args: res.getArgs(),
    type: res.getType(),
    resolve: res.getResolve()
  })
})

module.exports = API
