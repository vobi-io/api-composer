const KoaRouter = require('koa-router')
const API = require('../../api')
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

  this.resolvers.map((resolver) => {


    const resolverFunc = this.loadResolverFunc(resolver._resolver)
    console.log('method:', method)
    console.log('path:', normalizePath(resolver._path))

    router[method](resolver._name, normalizePath(resolver._path), async ctx => {
      console.log('params:', ctx.params)
      console.log('query:', ctx.request.query)
      console.log('request.body:', ctx.request.body)
      let args = {}
      if (ctx.params) {
        args = {
          ...ctx.params
        }
      }
      if (ctx.request.query) {
        args.filter = ctx.request.query
      }
      if (ctx.request.body) {
        args.record = ctx.request.body
      }
      ctx.body = await resolverFunc({
        source: undefined,
        args,
        context: ctx,
        info: undefined,
      })
    })
  })

  return router
})

module.exports = API
