const { Router } = require('express')
const { Binding } = require('graphql-binding')
const API = require('../../api')
// const { initResolvers } = require('../../helpers')
const { normalizePath, guessMethod, prepareArgs } = require('../../helpers')
// const buildSchema = require('../../build-schema')
// const { InputTypeComposer } = require('graphql-compose')
// const { graphql } = require('graphql')

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

API.macro('getExpressRoutes', function () {
  const router = Router()
  
  const graphqlSchema = this.getGraphqlSchema()
  const resolvers = this.getInitializedResolvers()
  
  const bindings = new Binding({
    schema: graphqlSchema,
  })

  resolvers
    .forEach(resolver => {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      // const q = buildQuery(resolver)

      router[method](path, async (req, res) => {
        try {
          const { fieldsSelection, ...args } = prepareArgs(req)

          // const runnableQuery = q(fieldsSelection)
          // const result = await graphql(graphqlSchema, runnableQuery, null, null, args, resolver._name)
          // res.json(result)
          const result = await bindings[resolver._kind][resolver._name](
            args, fieldsSelection || ''
          )
          // console.log('result', result)
          res.json(result)
          // if (this._responseDecorator) {
          //   this._responseDecorator(rp.context.payload, res)
          //   return
          // }
        } catch (error) {
          console.log(error)
          // if (this._onError) {
          //   this._onError(err, res)
          //   return
          // }
          res.status(500)
          res.send({ errors: error })
        }
      })
    })

  // prepareResolvers(Array.from(this._resolvers.values()))
  //   .forEach(resolver => {
  //     const method = guessMethod(resolver._methods)
  //     const path = normalizePath(resolver._path)

  //     router[method](path, async (req, res) => {
  //       try {
  //         const args = prepareArgs(req)

  //         const fieldsSelection = ctx.query.fieldsSelection
  //           ? ctx.query.fieldsSelection
  //           : undefined
  //         const result = await bindings[resolver._kind][resolver._name](args, fieldsSelection)
  //         console.log('result', result)
  //         res.json(result)
          
  //         // if (this._responseDecorator) {
  //         //   this._responseDecorator(rp.context.payload, res)
  //         //   return
  //         // }
  //       } catch (err) {
  //         // if (this._onError) {
  //         //   this._onError(err, res)
  //         //   return
  //         // }
  //         res.status(500)
  //         res.send({ errors: error.map(({ message }) => ({ message })) })
  //       }
  //     })
  //   })

  return router
})

module.exports = API
