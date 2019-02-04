const express = require('express')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { graphqlSchema, routes } = require('./api')

const app = express()

app.use(bodyParser.json())

app.use('/', routes)

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    graphiql: true
  })
)

app.listen(8000, function () {
  console.log('app launch on 8000')
  console.log('Go to http://localhost:8000/graphql for preview')
})

