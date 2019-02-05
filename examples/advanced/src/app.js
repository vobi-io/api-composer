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

const router = api.getExpressRoutes()
router.get('/', (req, res) => {
  res.json({
    'Available routes': {
      '/me': 'GET request to get user by access_token returned from sign-in or sign-up methods (provided in query string like /me?access_token=...)',
      '/sign-in': 'POST request to sign in with email and password provided in body json',
      '/sign-up': 'POST request to register with email, password, firstName and lastName in body json'
    }
  })
})
app.use(router)

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

