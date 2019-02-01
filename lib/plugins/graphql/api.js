'use strict'

const {
  TypeComposer,
  schemaComposer,
  Resolver: GQLResolver
} = require('graphql-compose')
const API = require('../../api')
const { chainResolver, nestedInput, guessType } = require('./helpers')
const { loadResolverFunc, loadResolverHook, prepareResolvers } = require('../../helpers')

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

API.macro('getGraphqlSchema', function () {
  schemaComposer.rootQuery().addFields({})
  schemaComposer.rootMutation().addFields({})

  prepareResolvers(Array.from(this._resolvers.values()))
    .forEach(resolver => {
      const type = guessType(resolver._type)

      const gqlResolverParams = {
        name: resolver._name,
        type,
        resolve: resolver._resolve,
      }

      if (resolver._args) {
        gqlResolverParams.args = {}
  
        switch (typeof resolver._args) {
          case 'string':
            gqlResolverParams.args = nestedInput({
              record: schemaComposer
                .getTC(resolver._args)
                .getInputTypeComposer()
                .getFields()
            }, resolver._name)
            break
          case 'object':
            gqlResolverParams.args = nestedInput(resolver._args, resolver._name)
            break
        }
      }
  
      let resolve = new GQLResolver(gqlResolverParams)
      let chainedResolve = null
  
      if (
        resolver._policies.length > 0 ||
        resolver._beforeMiddlewares.length > 0 ||
        resolver._afterMiddlewares.length > 0
      ) {
        // const pathsToFunctions =
        //   (paths, resolver, isPolicy = false) =>
        //     paths.map(
        //       funcPath => loadResolverHook(funcPath, resolver, isPolicy)
        //     )
  
        // const middlewarePathsToFunctions =
        //   (middlewares, resolver) => {
        //     return middlewares.map(
        //       middleware => ({
        //         exec: middleware.exec,
        //         actions: pathsToFunctions(middleware.actions, resolver, !!middleware.isPolicy)
        //       })
        //     )
        //   }
  
        let befores = []
        if (resolver._policies.length > 0) {
          befores = [...resolver._policies]
        }
  
        if (resolver._beforeMiddlewares.length > 0) {
          befores = [
            ...befores,
            ...resolver._beforeMiddlewares
          ]
        }
  
        chainedResolve = chainResolver(
          resolve,
          {
            before: befores.length > 0
              // ? middlewarePathsToFunctions(befores, resolver)
              ? befores
              : undefined,
            after: resolver._afterMiddlewares
              // ? middlewarePathsToFunctions(resolver._afterMiddlewares, resolver)
              ? resolver._afterMiddlewares
              : undefined
          }
        )
      }

      const kind = resolver._kind 
        ? `root${resolver._kind.charAt(0).toUpperCase()}${resolver._kind.slice(1)}` 
        : 'rootQuery'

      schemaComposer[kind]().addFields({
        [resolver._name]: chainedResolve || resolve
      })
    })

  return TypeComposer.schemaComposer.buildSchema()
})

module.exports = API
