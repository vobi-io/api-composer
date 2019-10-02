'use strict'

const {
  schemaComposer
} = require('graphql-compose')

const buildSchema =
  resolvers => {
    schemaComposer.Query.addFields({})
    schemaComposer.Mutation.addFields({})

    resolvers
      .forEach(resolver => {
        const kind = resolver._kind
          ? `${resolver._kind.charAt(0).toUpperCase()}${resolver._kind.slice(1)}`
          : 'Query'

        schemaComposer[kind].addFields({
          [resolver._name]: resolver._gqlResolver
        })
      })

    return schemaComposer.buildSchema()
  }

module.exports = buildSchema
