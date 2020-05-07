const { Router } = require('express')
const { Binding } = require('graphql-binding')
const API = require('../../api')
const { normalizePath, guessMethod, prepareArgs, generateFieldsSelection, capitalize } = require('../../helpers')

API.macro('responseDecorator', function (responseDecorator) {
  if (typeof responseDecorator !== 'function') {
    throw new TypeError('responseDecorator must be function')
  }
  this._responseDecorator = responseDecorator
  return this
})

API.macro('onError', function (onErrorFunc) {
  if (typeof onErrorFunc !== 'function') {
    throw new TypeError('onErrorFunc must be function')
  }
  this._onError = onErrorFunc
  return this
})

API.macro('setExpressContext', function (contextSetterFn) {
  this._expressContextSetter = contextSetterFn
})

API.macro('getExpressRoutes', function () {
  const router = Router()

  const graphqlSchema = this.getGraphqlSchema()

  const resolvers = this.getInitializedResolvers()

  const bindings = new Binding({
    schema: graphqlSchema
  })

  resolvers
    .forEach(resolver => {
      if (!resolver._isGraphqlOnly) {
        const method = guessMethod(resolver._methods)
        const path = normalizePath(resolver._path)
        let defaultFieldsSelection = resolver._defaultFieldsSelection
        if (defaultFieldsSelection === 'all') {
          const levelDepthLimit = resolver._restFieldsSelectionDepthLimit || 100
          const { query: dfs } = generateFieldsSelection(
            resolver._name,
            capitalize(resolver._kind),
            graphqlSchema,
            levelDepthLimit
          )
          defaultFieldsSelection = dfs
        }

        router[method](path, async (req, res) => {
          try {
            const args = prepareArgs(req, resolver)
            const { fieldsSelection } = req.query

            const context = this._expressContextSetter
              ? this._expressContextSetter(req)
              : undefined
            const result = await bindings[resolver._kind][resolver._name](
              args, fieldsSelection || defaultFieldsSelection || '', { context }
            )
            res.json(result)
          } catch (error) {
            const result = {
              message: error.message
            }
            if (error.code) {
              result.code = error.code
            }
            let status = 500
            if (error.originalError && error.originalError.errors) {
              const errors = error.originalError.errors
              const filterErrors = errors.filter(i => i.originalError && i.originalError.extra)
              if (filterErrors.length > 0) {
                const extra = filterErrors[0].originalError.extra
                if (extra.status) {
                  status = extra.status
                }
                if (extra.code) {
                  result.code = extra.code
                }
              }
            }
            res.status(status)
            res.send({ error: result })
          }
        })
      }
    })

  return router
})

module.exports = API
