const Koa = require('koa')
const koaBody = require('koa-body')
const Router = require('koa-router')
const graphqlHTTP = require('koa-graphql')
const { koaRouter, graphqlSchema } = require('./api')

const app = new Koa()
app.use(koaBody())

const router = new Router()
router.all('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  graphiql: true
}))

app
  .use(router.routes())
  .use(router.allowedMethods())
  
app
  .use(koaRouter.routes())
  .use(koaRouter.allowedMethods())

app.listen('8000', () => {
  console.log('app running on 8000')
  console.log('Go to http://localhost:8000 for koa routes')
  console.log('Go to http://localhost:8000/graphql for graphql')
})
