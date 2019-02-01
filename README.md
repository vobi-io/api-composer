# API Composer 

api-composer is a tool to describe node.js APIs with simple and elegant syntax. If you like simplicity and need to build complex GraphQL and/or REST APIs from single API description, you will love api-composer.

## Table of Contents
- [Why?](#why?)
- [Install](#install)
- [Quick Demo](#quick-demo)
- [More complex examples](#complex-examples)

## Why?

Simply speaking api-composer is a kind of configuration layer. It's just a way to describe API
with the concepts coming from graphql ecosystem. You can generate anything you want from
this description. You need just write your own plugin for this purpose or use already built plugins. By default api-composer comes with graphql schema generator that is based on excellent [graphql-composer](https://github.com/graphql-compose/graphql-compose "graphql-composer") library.

With adopting api-composer you can graphqlize even your REST API. 

Here are main benefits:
* Simple and elegant syntax to describe API.
* Single source from which you can generate graphql schema, routes for express/koa and so on.
* Middleware system which you can use to run functions before and after resolve function. You can run some middlewares synchronously and others - asynchronously.

## Install
```
npm i @vobi/api-composer
```

## Quick Demo

Create simple project and initialize package.json
```
mkdir coolapi && cd coolapi
npm init -y
```

Install some npm packages to actually build and serve graphql api
```
npm i @vobi/api-composer graphql graphql-compose express express-graphql body-parser
```

Create index.js file
```
touch index.js
```

Alongside of other necessary modules import and initialize api-composer
```js
const express = require('express')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { ApiComposer } = require('@vobi/api-composer')

const app = express()

app.use(bodyParser.json())

const api = new ApiComposer()

```
 
Add simple query and simple mutation.
```js
api.query('hello', () => 'Hello, World!')
api.mutation('simpleMutation', () => 'I am a simple mutation')
```
Note: first argument is a name of query/mutation and second - resolve function.

Finally, you can generate and pass schema to express' graphqlHTTP middleware, and run express app
```js
app.use(
  '/graphql',
  graphqlHTTP({
    schema: api.getGraphqlSchema(),
    graphiql: true
  })
)

app.listen(8000, function () {
  console.log('app launch on 8000')
  console.log('Go to http://localhost:8000/graphql')
})
```

That's it. Complete index.js file will look like this
```js
const express = require('express')
const bodyParser = require('body-parser')
const graphqlHTTP = require('express-graphql')
const { ApiComposer } = require('@vobi/api-composer')

const app = express()

app.use(bodyParser.json())

const api = new ApiComposer()

api.query('hello', () => 'Hello, World!')
api.mutation('simpleMutation', () => 'I am a simple mutation')

const graphqlSchema = api.getGraphqlSchema()

app.use(
  '/graphql',
  graphqlHTTP({
    schema: api.getGraphqlSchema(),
    graphiql: true
  })
)

app.listen(8001, function () {
  console.log('app launch on 8001')
  console.log('Go to http://localhost:8001/graphql')
})
```

When you run the program (node index.js) and open http://localhost:8001/graphql you can request to our query and mutation:
```graphql
query hello {
  hello
}
```
and
```graphql
mutation simpleMutation {
  simpleMutation
}
```

## More Examples

You can see more examples in [./examples](https://github.com/giiorg/vobi-api-composer-experimental/tree/master/examples) folder of this repository.

### License

API Composer is [MIT licensed](./LICENSE).