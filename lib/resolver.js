'use strict'

const { Macroable } = require('macroable')
const {
  arrayfy,
  initRawGqlResolver,
  prepareResolveFunc,
  isEmpty
} = require('./helpers')
const utils = require('./utils')

class Resolver extends Macroable {
  constructor({
    name,
    path,
    resolve = () => { },
    before,
    after,
    kind,
    type,
    beforeMiddlewares = [],
    afterMiddlewares = [],
    policies = [],
    methods = [],
    graphqlOnly = false,
    doc
  } = {}) {
    super()

    this._name = name
    this._path = path
    this._resolve = resolve
    this._before = before
    this._after = after
    this._kind = kind
    this._type = type
    this._beforeMiddlewares = beforeMiddlewares
    this._afterMiddlewares = afterMiddlewares
    this._policies = policies
    this._methods = methods
    this._isGraphqlOnly = graphqlOnly
    this._doc = doc
  }

  kind(kind) {
    this._kind = kind
    return this
  }

  doc(doc) {
    this._doc = doc
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

  policiesPath(dir) {
    this._policiesPath = dir
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

  validateArgs(validations) {
    return ({ args }) => {
      for (const key in validations) {
        for (const validate of validations[key]) {
          const result = validate(args[key], key, args)
          if (typeof result === 'string') return Promise.reject(new Error(result))
          return true
        }
      }
    }
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
      if (namedArgs.length > 0 && namedArgs.charAt(namedArgs.length - 1) === '/') {
        namedArgs = namedArgs.substring(0, namedArgs.length - 1)
      }
      this.path(`${this._path}${namedArgs}`)
    }

    const validations = {}
    for (const key in args) {
      if (!utils.reservedArgs[key] && typeof args[key] === 'object' && args[key].validate) {
        validations[key] = args[key].validate
      }
    }

    const validationMiddleware = this.validateArgs(validations)
    if (!isEmpty(validations)) this.beforeAtbeggining(validationMiddleware)

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

  applyMiddlewaresAtBeginning(middlewares, when, exec) {
    this[`_${when}Middlewares`].unshift({
      exec,
      actions: arrayfy(middlewares)
    })
    return this
  }

  beforeAtbeggining(middlewares) {
    return this.applyMiddlewaresAtBeginning(middlewares, 'before', 'sync')
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

  getGqlResolver() {
    if (!this._gqlResolver) {
      const _resolve = prepareResolveFunc(this._resolve, this._resolversPath)
      this._gqlResolver = initRawGqlResolver(this, _resolve)
    }

    return this._gqlResolver
  }

  query(name, resolve = () => { }) {
    return this._apiComposerInstance.query(name, resolve)
  }

  mutation(name, resolve = () => { }) {
    return this._apiComposerInstance.mutation(name, resolve)
  }

  queryOf(tcName, name) {
    return this._apiComposerInstance.queryOf(tcName, name)
  }

  mutationOf(tcName, name) {
    return this._apiComposerInstance.mutationOf(tcName, name)
  }

  graphqlOnly(isGraphqlOnly = true) {
    this._isGraphqlOnly = isGraphqlOnly
    return this
  }

  restDefaultFieldsSelection(defaultFieldsSelection) {
    this._defaultFieldsSelection = defaultFieldsSelection
    return this
  }

  restFieldsSelectionDepthLimit(restFieldsSelectionDepthLimit) {
    this._restFieldsSelectionDepthLimit = restFieldsSelectionDepthLimit
    return this
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
