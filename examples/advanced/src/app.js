const express = require('express')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { mergeApis } = require('@vobi/api-composer')
const { authMiddleware } = require('app/policies/auth-middleware')
const userApi = require('./modules/user/api')
const { onErrorExpress, onErrorGraphql, responseDecorator } = require('app/utils')

const app = express()
app.use(bodyParser.json())

const api = mergeApis([userApi])

app.use(authMiddleware)

api.onError(onErrorExpress)
api.responseDecorator(responseDecorator)
app.use(api.getExpressRoutes())

app.use(
  '/graphql',
  graphqlHTTP({
    schema: api.getGraphqlSchema(),
    graphiql: true,
    formatError: onErrorGraphql,
  })
)

app.listen(8000, function () {
  console.log('app running on 8000')
  console.log('Go to http://localhost:8000 for express routes')
  console.log('Go to http://localhost:8000/graphql for graphql')
})

