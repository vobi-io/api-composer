'use strict'

const {
  TypeComposer,
  schemaComposer
} = require('graphql-compose')

const buildSchema = 
  resolvers => {
    schemaComposer.rootQuery().addFields({})
    schemaComposer.rootMutation().addFields({})
  
    resolvers
      .forEach(resolver => {
        const kind = resolver._kind 
          ? `root${resolver._kind.charAt(0).toUpperCase()}${resolver._kind.slice(1)}` 
          : 'rootQuery'
  
        schemaComposer[kind]().addFields({
          [resolver._name]: resolver._gqlResolver,
        })
      })
  
    return TypeComposer.schemaComposer.buildSchema()
  }


module.exports = buildSchema
