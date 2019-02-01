const { Router } = require('express')
const ApiResponse = require('../../api-response')
const API = require('../../api')
const { prepareResolvers } = require('../../helpers')
const { normalizePath, guessMethod, prepareArgs } = require('./helpers')

API.macro('onError', function (onErrorFunc) {
  if (typeof onErrorFunc !== 'function') {
    throw new TypeError('onErrorFunc must be function')
  }
  this._onError = onErrorFunc
  return this
})

API.macro('getExpressRoutes', function () {
  const router = Router()
  
  prepareResolvers(Array.from(this._resolvers.values()))
    .forEach(resolver => {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      router[method](path, async (req, res) => {
        try {
          const rp = {
            source: undefined,
            args: prepareArgs(req),
            context: {
              user: req.user,
            },
            info: undefined,
          }
          
          if (resolver._beforeMiddlewares && resolver._beforeMiddlewares.length > 0) {
            const beforeSyncs = []
            resolver._beforeMiddlewares.forEach(middlewaresGroup => {
              switch (middlewaresGroup.exec) {
                case 'sync':
                  middlewaresGroup.actions.forEach(middleware => {
                    beforeSyncs.push(middleware(rp))
                  })
                  break
                case 'async':
                  middlewaresGroup.actions.forEach(middleware => {
                    middleware(rp)
                  })
                  break
                default:
              }
            })
            if (beforeSyncs.length > 0) {
              await Promise.all(beforeSyncs)
            }
          }

          rp.context.payload = await resolver._resolve(rp)

          if (resolver._afterMiddlewares && resolver._afterMiddlewares.length > 0) {
            const aftersSyncs = []
            resolver._afterMiddlewares.forEach(middlewaresGroup => {
              switch (middlewaresGroup.exec) {
                case 'sync':
                  middlewaresGroup.actions.forEach(middleware => {
                    aftersSyncs.push(middleware(rp))
                  })
                  break
                case 'async':
                  middlewaresGroup.actions.forEach(middleware => {
                    middleware(rp)
                  })
                  break
                default:
              }
            })
            if (aftersSyncs.length > 0) {
              await Promise.all(aftersSyncs)
            }
          }

          if (rp.context.payload instanceof ApiResponse) {
            if (rp.context.payload.statusCode) {
              res.status(rp.context.payload.statusCode)
            }
            res.send(rp.context.payload.payload)
          } else {
            res.send(rp.context.payload)
          }
        } catch (err) {
          if (this._onError) {
            this._onError(err, res)
            return
          }
          res.status(500)
          res.send(err)
          // if (err.statusCode) {
          //   res.status(err.statusCode)
          // }
          // res.send(err.payload)
        }
      })
    })

  return router
})

module.exports = API
