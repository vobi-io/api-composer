'use strict'

const {
  InputTypeComposer,
  TypeComposer,
  schemaComposer,
  Resolver: GQLResolver
} = require('graphql-compose')

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

const filterMiddlewaresByName =
  name =>
    m => {
      if (m._only && m._only.length > 0) {
        if (m._only.includes(name)) {
          return m
        }
      } else {
        if (!m._except || !m._except.includes(name)) {
          return m
        }
      }
    }

const capitalize =
  str =>
    str
      .charAt(0)
      .toUpperCase() + str.slice(1)

const loadResolverHook = (hook, resolver, isPolicy) => {
  const cwd = process.cwd()
  let resolverFunc = null
  if (typeof hook === 'string') {
    const [controller, action] = hook.split('.')
    const rPath =
      isPolicy
        ? `${cwd}/src/policies/${controller}`
        : `${c._resolversPath}/${controller}`
    if (action) {
      const CtrlClass = require(rPath)
      const Ctrl = new CtrlClass()
      resolverFunc = Ctrl[action]
    } else {
      resolverFunc = require(rPath)
    }
  } else {
    resolverFunc = hook
  }
  if (typeof resolverFunc !== 'function') {
    throw new Error('resolver is not a function!')
  }
  return resolverFunc
}

const loadResolverFunc = resolver => {
  let resolverFunc = null
  if (typeof c._resolve === 'string') {
    const [controller, action] = c._resolve.split('.')
    if (action) {
      const CtrlClass = require(`${c._resolversPath}/${controller}`)
      const Ctrl = new CtrlClass()
      resolverFunc = Ctrl[action]
    } else {
      resolverFunc = require(`${c._resolversPath}/${controller}`)
    }
  } else {
    resolverFunc = c._resolve
  }

  if (typeof resolverFunc !== 'function') {
    throw new TypeError('resolver is not a function!')
  }
  return resolverFunc
}

const loadPolicy = func => {
  const cwd = process.cwd()
  let resolverFunc = null
  if (typeof func === 'string') {
    const [controller, action] = func.split('.')
    if (action) {
      const CtrlClass = require(`${cwd}/src/policies/${controller}`)
      const Ctrl = new CtrlClass()
      resolverFunc = Ctrl[action]
    } else {
      resolverFunc = require(`${cwd}/src/policies/${controller}`)
    }
  } else {
    resolverFunc = func
  }
  if (typeof resolverFunc !== 'function') {
    throw new Error('resolver is not a function!')
  }
  return resolverFunc
}

const pathsToFunctions =
  (paths, resolver, isPolicy = false) =>
    paths.map(
      funcPath => loadResolverHook(funcPath, resolver, isPolicy)
    )

const middlewarePathsToFunctions =
  (middlewares, resolver) =>
    middlewares.map(
      middleware => ({
        exec: middleware.exec,
        actions: pathsToFunctions(middleware.actions, resolver, !!middleware.isPolicy)
      })
    )

const prepareResolveFunc =
  (func, resolvesPath) => {
    try {
      let resolverFunc = null

      switch (typeof func) {
        case 'string':
          const [controller, action] = func.split('.')
          if (action) {
            const CtrlClass = require(`${resolvesPath}/${controller}`)
            const Ctrl = new CtrlClass()
            resolverFunc = Ctrl[action]
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
        throw new TypeError('Resolve is not a valid function')
      }

      return resolverFunc
    } catch (e) {
      console.log('Could not prepare resolve func: ', e)
    }
  }

const prepareMiddlewareActions =
  (actions, resolvesPath) =>
    actions.map(
      action => prepareResolveFunc(action, resolvesPath)
    )

const prepareMiddlewares =
  (middlewares, resolvesPath) =>
    middlewares.map(middleware => ({
      exec: middleware.exec,
      actions: prepareMiddlewareActions(middleware.actions, resolvesPath)
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
        _afterMiddlewares,
      }
    })

const nestedInput =
  (args, name) =>
    Object.keys(args).reduce((acc, key) => {
      if (typeof args[key] === 'object' && !args[key].type) {
        acc[key] = InputTypeComposer.create({
          name: `${capitalize(name)}${capitalize(key)}`,
          fields: nestedInput(args[key], name)
        })
      } else {
        acc[key] = args[key]
      }
      return acc
    }, {})

const guessType =
  type => {
    if (type) {
      if (typeof type === 'string') {
        if (['String', 'Int', 'Float', 'JSON', 'Date'].includes(type)) {
          return type
        } else if (type.startsWith('[') && type.endsWith(']')) {
          return [TypeComposer.schemaComposer.getTC(type.slice(1, -1))]
        } else {
          return TypeComposer.schemaComposer.get(type)
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

const attachToAll =
  resolver =>
    queries => {
      const attachResolver = attachTo(resolver)

      return Object
        .keys(queries)
        .reduce(
          (result, name) => {
            result[name] = attachResolver(queries[name])
            return result
          },
          {}
        )
    }

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
      type,
      resolve: _resolve,
    }

    if (c._args) {
      gqlResolverParams.args = {}

      switch (typeof c._args) {
        case 'string':
          gqlResolverParams.args = nestedInput({
            record: schemaComposer
              .getTC(c._args)
              .getInputTypeComposer()
              .getFields()
          }, c._name)
          break
        case 'object':
          gqlResolverParams.args = nestedInput(c._args, c._name)
          break
      }
    }

    return new GQLResolver(gqlResolverParams)
  }

const initResolver =
  c => {
    const _resolve = prepareResolveFunc(c._resolve, c._resolversPath)
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
      c._policies.length > 0 ||
      _beforeMiddlewares.length > 0 ||
      _afterMiddlewares.length > 0
    ) {
      let befores = []
      if (c._policies.length > 0) {
        befores = [...c._policies]
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
          after: _afterMiddlewares
            ? _afterMiddlewares
            : undefined
        }
      )
    }

    return {
      ...c,
      _resolve,
      _beforeMiddlewares,
      _afterMiddlewares,
      _gqlResolver: chainedResolve || resolve,
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
        ...req.query,
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
        : '',
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


module.exports = {
  camelCaseToDashed,
  arrayfy,
  filterMiddlewaresByName,
  capitalize,
  loadResolverHook,
  loadResolverFunc,
  loadPolicy,
  middlewarePathsToFunctions,
  prepareResolvers,
  initResolvers,
  prepareResolveFunc,
  initRawGqlResolver,
  normalizePath,
  guessMethod,
  prepareArgs,
  buildArgs,
  buildQuery,
}
