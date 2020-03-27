const KoaRouter = require('koa-router')
const { Binding } = require('graphql-binding')
const API = require('../../api')
const { normalizePath, guessMethod, prepareArgs } = require('../../helpers')

API.macro('getKoaRouter', function () {
  const router = new KoaRouter()

  const graphqlSchema = this.getGraphqlSchema()
  const resolvers = this.getInitializedResolvers()

  const bindings = new Binding({
    schema: graphqlSchema
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
            body: ctx.request.body
          })
          const fieldsSelection = ctx.query.fieldsSelection
            ? ctx.query.fieldsSelection
            : undefined
          const result = await bindings[resolver._kind][resolver._name](args, fieldsSelection)
          ctx.body = { data: result }
        } catch (error) {
          const body = {
            errors: Array.isArray(error)
              ? error.map(({ message }) => ({ message }))
              : error
          }
          ctx.status = 500
          ctx.body = body
        }
      })
    })

  return router
})

module.exports = API
