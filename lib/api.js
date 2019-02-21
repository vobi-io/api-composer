'use strict'

// const path = require('path')
const { Macroable } = require('macroable')
const { arrayfy, camelCaseToDashed, filterMiddlewaresByName, initResolvers } = require('./helpers')
const buildSchema = require('./build-schema')
const Resolver = require('./resolver')
const MiddlewareConfig = require('./middleware-config')

const defaultArgs = {
  resolversPath: null,
  beforeMiddlewares: [],
  afterMiddlewares: [],
  policies: [],
  defaultType: 'JSON'
}

class API extends Macroable {
  constructor({
    resolversPath,
    beforeMiddlewares,
    afterMiddlewares,
    policies,
    defaultType,
  } = defaultArgs) {
    super()

    this._resolvers = new Map()
    this._resolversPath = resolversPath
    this._beforeMiddlewares = beforeMiddlewares
    this._afterMiddlewares = afterMiddlewares
    this._policies = policies
    this._defaultType = defaultType
    this._initializedResolvers = null
    this._graphqlSchema = null
  }

  setDefaultType(defaultType) {
    this._defaultType = defaultType
  }

  add({ name, methods, args, path, type, kind = 'query', resolve = async () => {} }) {
    const resolver = new Resolver()
    resolver.name(name)
    resolver.kind(kind)
    resolver.methods(
      methods || kind === 'mutation'
        ? 'post'
        : 'get'
    )
    let tp = type
    if (!type) {
      if (this._defaultType) {
        tp = this._defaultType
      } else {
        tp = 'JSON'
      }
    }

    resolver.type(tp)

    path = path || camelCaseToDashed(name)

    if (args) {
      resolver.args(args)
      let namedArgs = ''
      Object.keys(args).forEach(k => {
        if (!['filter', 'sort', 'limit', 'offset', 'record'].includes(args[k])) {
          namedArgs += `:${k}/`
        }
      })
      if (namedArgs.length > 0 && namedArgs.charAt(namedArgs.length - 1) === '/') {
        namedArgs = namedArgs.substring(0, namedArgs.length - 1);
      }
      path = `${path}${namedArgs}`
    }

    resolver.path(path)
    // resolver.resolversPath(`${process.cwd()}/src/modules/${this._module}/resolvers`)
    resolver.resolversPath(this._resolversPath)
    if (resolve) {
      resolver.resolve(resolve)
    }

    const filterMiddlewares = filterMiddlewaresByName(name)

    if (this._policies && this._policies.length > 0) {
      resolver._policies =
        this._policies.filter(filterMiddlewares)
    }
    if (this._beforeMiddlewares && this._beforeMiddlewares.length > 0) {
      resolver._beforeMiddlewares =
        this._beforeMiddlewares.filter(filterMiddlewares)
    }
    if (this._afterMiddlewares && this._beforeMiddlewares.length > 0) {
      resolver._afterMiddlewares =
        this._afterMiddlewares.filter(filterMiddlewares)
    }

    resolver._apiComposerInstance = this

    this._resolvers.set(name, resolver)

    // this._resolvers.push(resolver)

    return resolver
  }

  query(name, resolve = () => {}) {
    return this.add({
      name,
      kind: 'query',
      resolve,
    })
  }

  mutation(name, resolve = () => {}) {
    return this.add({
      name,
      kind: 'mutation',
      resolve,
    })
  }

  setResolversPath(dir) {
    this._resolversPath = dir
    return this
  }

  get(path, resolve) {
    const resolver = new Resolver()
    resolver.path(path)
    if (resolve) {
      resolver.resolve(resolve)
    }
    this._resolvers.push(resolver)
    return resolver
  }

  getResolvers() {
    return this._resolvers
  }

  setResolvers(resolvers) {
    this._resolvers = resolvers
    return this
  }

  modify(identifier) {
    return this._resolvers.find(r => r._path === identifier || r._name === identifier)
  }

  applyMiddlewares(middlewares, when, exec) {
    const mid = new MiddlewareConfig(arrayfy(middlewares), exec, this)
    this[`_${when}Middlewares`].push(mid)
    return mid
  }

  before(middlewares) {
    return this.applyMiddlewares(middlewares, 'before', 'sync')
  }

  after(middlewares) {
    return this.applyMiddlewares(middlewares, 'after', 'sync')
  }

  beforeAsync(middlewares) {
    return this.applyMiddlewares(middlewares, 'before', 'async')
  }

  afterAsync(middlewares) {
    return this.applyMiddlewares(middlewares, 'after', 'async')
  }

  policy(funcs) {
    const policy = new MiddlewareConfig(arrayfy(funcs), 'sync', this, true)
    this._policies.push(policy)
    return policy
  }

  getInitializedResolvers() {
    if (!this._initializedResolvers) {
      this._initializedResolvers = initResolvers(Array.from(this._resolvers.values()))
    }
    return this._initializedResolvers
  }

  getGraphqlSchema() {
    if (!this._graphqlSchema) {
      if (!this._initializedResolvers) {
        this._initializedResolvers = initResolvers(Array.from(this._resolvers.values()))
      }
      this._graphqlSchema = buildSchema(this._initializedResolvers)
    }
    return this._graphqlSchema
  }
}

module.exports = API
