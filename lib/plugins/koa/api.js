const KoaRouter = require('koa-router')
const API = require('../../api')
const { prepareResolvers } = require('../../helpers')
const { normalizePath, guessMethod, prepareArgs } = require('./helpers')

API.macro('getKoaRouter', function () {
  const router = new KoaRouter()

  prepareResolvers(Array.from(this._resolvers.values()))
    .forEach(resolver => {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      router[method](resolver._name, path, async ctx => {
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
        } catch (e) {
          console.log('e', e)
        }
      })
    })
  
  return router
})

module.exports = API
