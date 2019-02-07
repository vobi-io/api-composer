const KoaRouter = require('koa-router')
const API = require('../../api')
const { prepareResolvers } = require('../../helpers')
const { normalizePath, guessMethod, prepareArgs } = require('./helpers')
const buildSchema = require('../graphql/build-schema')
const { Binding } = require('graphql-binding')

API.macro('getKoaRouter', function () {
  const router = new KoaRouter()

  const resolvers = prepareResolvers(
    Array.from(this._resolvers.values())
  )
  const graphqlSchema = buildSchema(resolvers)
  const bindings = new Binding({
    schema: graphqlSchema,
  })

  resolvers
    .forEach(resolver => {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      router[method](resolver._name, path, async ctx => {  
        try {
          const args = prepareArgs({
            params: ctx.params,
            query: ctx.request.query,
            body: ctx.request.body,
          })
          const fieldsSelection = ctx.query.fieldsSelection
            ? ctx.query.fieldsSelection
            : undefined
          const result = await bindings[resolver._kind][resolver._name](args, fieldsSelection)
          ctx.body = { data: result }
        } catch (error) {
          console.log('error', error)
          ctx.status = 500
          ctx.body = { errors: error.map(({ message }) => ({ message })) }
          // ctx.body = { errors: error }
        }
      })
    })
  
  return router
})

module.exports = API
