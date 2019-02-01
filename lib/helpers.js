'use strict'

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
        : `${resolver._resolversPath}/${controller}`
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
  if (typeof resolver._resolve === 'string') {
    const [controller, action] = resolver._resolve.split('.')
    if (action) {
      const CtrlClass = require(`${resolver._resolversPath}/${controller}`)
      const Ctrl = new CtrlClass()
      resolverFunc = Ctrl[action]
    } else {
      resolverFunc = require(`${resolver._resolversPath}/${controller}`)
    }
  } else {
    resolverFunc = resolver._resolve
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
}