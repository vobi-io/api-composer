'use strict'

const { InputTypeComposer, TypeComposer } = require('graphql-compose')
const { capitalize } = require('../../helpers')

const nestedInput = (args, name) => {
  return Object.keys(args).reduce((acc, key) => {
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

const arrayfy =
  src =>
    Array.isArray(src)
      ? src
      : [src]

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

module.exports = {
  nestedInput,
  attachTo,
  attachToAll,
  promiseToPreResolver,
  promiseToPostResolver,
  chainToResolver,
  chainResolver,
  guessType,
}
