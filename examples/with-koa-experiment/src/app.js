const Koa = require('koa')
const koaBody = require('koa-body')
const { koaRouter } = require('./api')

const app = new Koa()

app
  .use(koaBody())

app
  .use(koaRouter.routes())

app.listen('8000', () => {
  console.log('app running on 8000')
  console.log('Go to http://localhost:8000 for koa routes')
  console.log('Go to http://localhost:8000/graphql for graphql')
})
