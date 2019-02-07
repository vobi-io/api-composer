'use strict'

const {
  TypeComposer,
  schemaComposer,
  Resolver: GQLResolver
} = require('graphql-compose')
const { chainResolver, nestedInput, guessType } = require('./helpers')

const buildSchema = 
  resolvers => {
    schemaComposer.rootQuery().addFields({})
    schemaComposer.rootMutation().addFields({})
  
    resolvers
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
                ? befores
                : undefined,
              after: resolver._afterMiddlewares
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
  }


module.exports = buildSchema
