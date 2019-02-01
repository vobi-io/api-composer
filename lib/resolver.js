'use strict'

const { Macroable } = require('macroable')
const { arrayfy } = require('./helpers')

class Resolver extends Macroable {
  constructor(config = {}) {
    super()

    this._name = config.name || undefined
    this._path = config.path || undefined
    this._resolve = config.resolve || (() => {})
    this._before = config.before ? arrayfy(config.before) : undefined
    this._after = config.after ? arrayfy(config.after) : undefined
    this._kind = config.kind || undefined
    this._type = config.type || undefined
    this._beforeMiddlewares = []
    this._afterMiddlewares = []
    this._policies = []
    if (config.get) {
      this._methods = ['get']
      this._path = config.get
    }
    if (config.post) {
      this._methods = ['post']
      this._path = config.post
    }
  }

  kind(kind) {
    this._kind = kind
    return this
  }

  path(path) {
    this._path = path
    return this
  }

  resolve(resolver) {
    this._resolve = resolver
    return this
  }

  resolversPath(dir) {
    this._resolversPath = dir
    return this
  }

  name(name) {
    this._name = name
    return this
  }

  methods(methods) {
    this._methods = arrayfy(methods)
    return this
  }

  args(args) {
    this._args = args

    if (!this._path && typeof args === 'object') {
      let namedArgs = ''
      Object.keys(args).forEach(k => {
        if (!['filter', 'sort', 'limit', 'offset', 'record'].includes(args[k])) {
          namedArgs += `:${k}/`
        }
      })
      if (namedArgs.length() > 0 && namedArgs.charAt(namedArgs.length() - 1) === '/') {
        namedArgs = namedArgs.substring(0, namedArgs.length() - 1);
      }
      this.path(`${this._path}${namedArgs}`)
    }

    return this
  }

  type(typeName) {
    this._type = typeName
    return this
  }

  policy(funcs) {
    this._policies.push({
      exec: 'sync',
      actions: arrayfy(funcs),
      isPolicy: true
    })
    return this
  }

  get(path) {
    this._path = path
    this._methods = ['get']
    return this
  }

  post(path) {
    this._path = path
    this._methods = ['post']
    return this
  }

  applyMiddlewares(middlewares, when, exec) {
    this[`_${when}Middlewares`].push({
      exec,
      actions: arrayfy(middlewares)
    })
    return this
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

  toObject() {
    return {
      name: this._name,
      path: this._name,
      resolver: this._name,
      methods: this._methods
    }
  }
}

Resolver._macros = {}
Resolver._getters = {}

module.exports = Resolver
