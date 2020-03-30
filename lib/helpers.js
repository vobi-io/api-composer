'use strict'

const {
  InputTypeComposer,
  schemaComposer,
  Resolver: GQLResolver,
  ObjectTypeComposer
} = require('graphql-compose')
var glob = require('glob')
var Resolver = require('./resolvers/resolver')
var Policy = require('./resolvers/policy')

const arrayfy =
  src =>
    Array.isArray(src)
      ? src
      : [src]

const camelCaseToDashed = str =>
  str.replace(
    /([A-Z])/g,
    a => `-${a.toLowerCase()}`
  )

const filterMiddlewaresByName = name => m => {
  try {
    if (m._only && m._only.length > 0) {
      if (m._only.includes(name)) {
        return true
      }
    } else {
      if (!m._except || !m._except.includes(name)) {
        return true
      }
    }

    return false
  } catch (err) {
    throw new Error(err)
  }
}

const capitalize =
  str =>
    str
      .charAt(0)
      .toUpperCase() + str.slice(1)

const loadPolicy = func => {
  const cwd = process.cwd()
  let resolverFunc = null
  if (typeof func === 'string') {
    const [controller, action] = func.split('.')
    if (action) {
      const CtrlClass = require(`${cwd}/src/policies/${controller}Policy`)
      const Ctrl = new CtrlClass()
      resolverFunc = Ctrl[action]
    } else {
      resolverFunc = require(`${cwd}/src/policies/${controller}Policy`)
    }
  } else {
    resolverFunc = func
  }
  if (typeof resolverFunc !== 'function') {
    throw new Error('resolver is not a function!')
  }
  return resolverFunc
}

const getController = (resolverPattern, controller, isPolicy) => {
  let resolver = null
  const files = glob.sync(resolverPattern)
  for (const file of files) {
    try {
      const CtrlClass = require(file)
      const ctrl = new CtrlClass()
      if (!isPolicy && ctrl instanceof Resolver) {
        if (ctrl.getName() === controller) {
          resolver = ctrl
          break
        }
      }

      if (isPolicy && ctrl instanceof Policy) {
        if (ctrl.getName() === controller) {
          resolver = ctrl
          break
        }
      }
    } catch (err) { }
  }
  return resolver
}

const prepareResolveFunc =
  (func, resolvesPath, isPolicy) => {
    try {
      let resolverFunc = null

      switch (typeof func) {
        case 'string':
          const [controller, action] = func.split('.')
          if (action) {
            // const CtrlClass = require(`${resolvesPath}/${controller}${isPolicy ? 'Policy' : 'Resolver'}`)
            // const Ctrl = new CtrlClass()
            // resolverFunc = Ctrl[action]

            const ctrl = getController(resolvesPath, controller, isPolicy)

            resolverFunc = ctrl[action]
          } else {
            resolverFunc = require(`${resolvesPath}/${controller}`)
          }
          break
        case 'function':
          resolverFunc = func
          break
        default:
          break
      }

      if (typeof resolverFunc !== 'function') {
        throw new TypeError(`Resolve is not a valid function: ${func}`)
      }

      return resolverFunc
    } catch (e) {
      console.log('Could not prepare resolve func: ', e)
    }
  }

const prepareMiddlewareActions =
  (actions, resolvesPath, isPolicy) =>
    actions.map(
      action => prepareResolveFunc(action, resolvesPath, isPolicy)
    )

const prepareMiddlewares =
  (middlewares, resolvesPath) =>
    middlewares.map(middleware => ({
      exec: middleware.exec,
      actions: prepareMiddlewareActions(middleware.actions, resolvesPath, middleware.isPolicy)
    }))

const prepareResolvers =
  resolversConfig =>
    resolversConfig.map(c => {
      const _resolve = prepareResolveFunc(c._resolve, c._resolversPath)
      const _beforeMiddlewares = prepareMiddlewares(c._beforeMiddlewares, c._resolversPath)
      const _afterMiddlewares = prepareMiddlewares(c._afterMiddlewares, c._resolversPath)

      return {
        ...c,
        _resolve,
        _beforeMiddlewares,
        _afterMiddlewares
      }
    })

const createType = ({ fields, name }) => {
  if (!name) throw new Error('Type Name not provided')
  if (!fields) throw new Error('Fields not provided')
  if (typeof fields !== 'object') throw new Error('Expected fields to be an object')
  return ObjectTypeComposer.create({
    name: `${capitalize(name)}`,
    fields
  }, schemaComposer)
}

const nestedInput = (args, name) => {
  const type = {}
  for (const key in args) {
    if (typeof args[key] === 'object' && !args[key].type) {
      type[key] = InputTypeComposer.create({
        name: `${capitalize(name)}${capitalize(key)}`,
        fields: nestedInput(args[key], name)
      }, schemaComposer)
    } else {
      type[key] = args[key]
    }
  }
  return type
}

const guessType =
  type => {
    if (type) {
      if (typeof type === 'string') {
        if (['String', 'Int', 'Float', 'JSON', 'Date'].includes(type)) {
          return type
        } else if (type.startsWith('[') && type.endsWith(']')) {
          return [schemaComposer.getAnyTC(type.slice(1, -1))]
        } else {
          return schemaComposer.get(type)
        }
      } else if (typeof type === 'object') {
        return type
      }
    } else {
      return 'JSON'
    }
  }

const attachTo =
  resolver =>
    query =>
      query.wrapResolve(resolver)

const defaultActionParams = [
  'args',
  'context'
]

const promiseToPreResolver =
  (actions, params = defaultActionParams) =>
    next =>
      // `rp` consist from { source, args, context, info, projection }
      rp => {
        return Promise
          .all(
            arrayfy(
              actions
            ).map(pre => pre(rp))
          )
          .then(() => next(rp))
      }

const promiseToPostResolver =
  (actions, params = defaultActionParams) =>
    next =>
      async rp => {
        const newRP = await next(rp)

        return Promise
          .all(
            arrayfy(
              actions
            ).map(pre => pre(rp, newRP))
          )
          .then(() => newRP)
      }

const chainToResolver =
  chain => {
    /**
     * to maintain correct order of execution
     * 1. need to find resolver obj in chain
     *    1.1. if no resolver, then throw error,
     *          cause no 'wrapResolve' method to call
     * 2. assume that items before resolver are all pre's
     *    2.1. pre resolvers should be wrapped in reverse order
     * 3. assume that items after resolver are all post's
     *    3.1. post resolvers should be wrapped in order
     *          they've been passed
     */
    const resolverIndex = chain
      .findIndex(
        item => 'wrapResolve' in item
      )
    if (resolverIndex === -1) {
      throw new Error(
        'chain should contain a resolver to call \'wrapResolve\''
      )
    }

    const sorted = [
      // put resolver first
      chain[resolverIndex],
      // then goes pre's in reverse
      ...chain
        .slice(
          0,
          resolverIndex
        )
        .reverse(),
      // lastly post's
      ...chain
        .slice(
          resolverIndex + 1,
          chain.length
        )
    ]

    return sorted
      .reduce(
        (result, current) => attachTo(current)(result),
        sorted.shift()
      )
  }

const applyAsyncBeforeMiddlewares =
  middlewares =>
    next =>
      rp => {
        middlewares.forEach(middleware => {
          middleware(rp)
        })

        return next(rp)
      }

const applyAsyncAfterMiddlewares =
  middlewares =>
    next =>
      async rp => {
        const resp = await next(rp)

        middlewares.forEach(middleware => {
          middleware(rp)
        })

        return resp
      }

const chainResolver =
  (resolve, { before, after }) => {
    let chain = []

    if (before) {
      chain = [...before.map(step => {
        if (step.exec === 'async') {
          return applyAsyncBeforeMiddlewares(step.actions)
        }
        if (step.exec === 'sync') {
          return promiseToPreResolver(step.actions)
        }
      })]
    }

    chain[chain.length] = resolve

    if (after) {
      chain = [
        ...chain,
        ...after.map(step => {
          if (step.exec === 'async') {
            return applyAsyncAfterMiddlewares(step.actions)
          }
          if (step.exec === 'sync') {
            return promiseToPostResolver(step.actions)
          }
        })
      ]
    }

    return chainToResolver(chain)
  }

const initRawGqlResolver =
  (c, _resolve) => {
    const type = guessType(c._type)
    const gqlResolverParams = {
      name: c._name,
      displayName: c._doc && c._doc.displayName ? c._doc.displayName : '',
      description: c._doc && c._doc.description ? c._doc.description : '',
      type,
      resolve: _resolve
    }

    if (c._args) {
      gqlResolverParams.args = {}

      switch (typeof c._args) {
        case 'string':
          gqlResolverParams.args = nestedInput({
            record: schemaComposer
              .getAnyTC(c._args)
              .getInputTypeComposer()
              .getFields()
          }, c._name)
          break
        case 'object':
          gqlResolverParams.args = nestedInput(c._args, c._name)
          break
      }
    }

    if (c._type && typeof c._type !== 'string' && c._type.constructor === Object) {
      gqlResolverParams.type = createType(c._type)
    }

    return new GQLResolver(gqlResolverParams, schemaComposer)
  }

const initResolver =
  c => {
    const _resolve = prepareResolveFunc(c._resolve, c._resolversPath)
    const _policies = prepareMiddlewares(c._policies, c._policiesPath)
    const _beforeMiddlewares = prepareMiddlewares(c._beforeMiddlewares, c._resolversPath)
    const _afterMiddlewares = prepareMiddlewares(c._afterMiddlewares, c._resolversPath)

    let resolve
    if (!c._gqlResolver) {
      resolve = initRawGqlResolver(c, _resolve)
    } else {
      resolve = c._gqlResolver
    }
    let chainedResolve = null

    if (
      _policies.length > 0 ||
      _beforeMiddlewares.length > 0 ||
      _afterMiddlewares.length > 0
    ) {
      let befores = []
      if (_policies.length > 0) {
        befores = [..._policies]
      }

      if (_beforeMiddlewares.length > 0) {
        befores = [
          ...befores,
          ..._beforeMiddlewares
        ]
      }

      chainedResolve = chainResolver(
        resolve,
        {
          before: befores.length > 0
            ? befores
            : undefined,
          after: _afterMiddlewares || undefined
        }
      )
    }

    return {
      ...c,
      _resolve,
      _beforeMiddlewares,
      _afterMiddlewares,
      _gqlResolver: chainedResolve || resolve
    }
  }

const initResolvers =
  resolversConfig =>
    resolversConfig.map(initResolver)

const normalizePath =
  p =>
    p.charAt(0) === '/'
      ? p
      : `/${p}`

const guessMethod =
  methods => {
    if (Array.isArray(methods) && methods.length > 0) {
      if (methods.length === 1) {
        return methods[0]
      }

      return 'all'
    }

    return 'get'
  }

const prepareArgs =
  req => {
    let args = {}

    if (req.params) {
      args = {
        ...req.params
      }
    }

    if (req.query && Object.keys(req.query).length) {
      args = {
        ...args,
        ...req.query
      }
    }

    if (req.body && Object.keys(req.body).length) {
      args = {
        ...args,
        ...req.body
      }
    }

    return args
  }

const buildArgs =
  args => {
    const argsArr = []
    const argsArrInQuery = []

    if (args) {
      Object.keys(args).forEach(key => {
        argsArr.push(`$${key}: ${
          args[key] instanceof InputTypeComposer
            ? args[key].getType()
            : args[key]
          }`)
        argsArrInQuery.push(`${key}: $${key}`)
      })
    }

    return {
      args: argsArr.length > 0
        ? `(${argsArr.join(', ')})`
        : '',
      argsInQuery: argsArrInQuery.length > 0
        ? `(${argsArrInQuery.join(', ')})`
        : ''
    }
  }

const buildQuery =
  resolver =>
    fieldsSelection => {
      let query = ''
      const { args, argsInQuery } = buildArgs(resolver._gqlResolver.args)
      query += `${resolver._kind} ${resolver._name}${args} {
        ${resolver._name}${argsInQuery}${fieldsSelection}
      }`

      return query
    }

function cleanName(name) {
  return name.replace(/[[\]!]/g, '')
}

function generateFieldsSelection(curName, curParentType, gqlSchema, levelDepthLimit = 100) {
  let query = ''
  const hasArgs = false

  function generateFieldData(name, parentType, parentFields, level) {
    const tabSize = 2
    const field = gqlSchema.getType(parentType).getFields()[name]

    const meta = {
      hasArgs: false
    }

    if (level >= levelDepthLimit) {
      return { query: '', meta: {} }
    } else {

    }
    let fieldStr = level > 1
      ? ' '.repeat(level * tabSize) + field.name
      : ''

    const curTypeName = cleanName(field.type.inspect())
    const curType = gqlSchema.getType(curTypeName)

    if (parentFields.filter(x => x.type === curTypeName).length) {
      return { query: '', meta: {} }
    }

    if (level >= levelDepthLimit) {
      return { query: '', meta: {} }
    }

    const innerFields = curType.getFields && curType.getFields()
    let innerFieldsData = null
    if (innerFields) {
      innerFieldsData = Object.keys(innerFields)
        .reduce((acc, cur) => {
          if (
            parentFields.filter(x => x.name === cur && x.type === curTypeName)
              .length
          ) {
            return ''
          }

          const curInnerFieldData = generateFieldData(
            cur,
            curTypeName,
            [...parentFields, { name, type: curTypeName }],
            level + 1
          )
          const curInnerFieldStr = curInnerFieldData.query

          meta.hasArgs = meta.hasArgs || curInnerFieldData.meta.hasArgs

          if (!curInnerFieldStr) {
            return acc
          }

          return `${acc}\n${curInnerFieldStr}`
        }, '')
        .substring(1)
    }

    if (innerFieldsData) {
      if (level > 1) {
        fieldStr += ' '
      }
      fieldStr += `{\n${innerFieldsData}\n`
      fieldStr += `${' '.repeat(level * tabSize)}}`
    }

    return { query: fieldStr, meta }
  }

  const fieldData = generateFieldData(curName, curParentType, [], 1)

  query += fieldData.query

  const meta = { ...fieldData.meta }

  meta.hasArgs = hasArgs || meta.hasArgs

  return { query, meta }
}

const isEmpty = (obj) => {
  return !Object.keys(obj).length
}

module.exports = {
  camelCaseToDashed,
  arrayfy,
  filterMiddlewaresByName,
  capitalize,
  loadPolicy,
  prepareResolvers,
  initResolvers,
  prepareResolveFunc,
  initRawGqlResolver,
  normalizePath,
  guessMethod,
  prepareArgs,
  buildArgs,
  buildQuery,
  generateFieldsSelection,
  guessType,
  isEmpty
}
