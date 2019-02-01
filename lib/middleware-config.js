'use strict'

const { arrayfy } = require('./helpers')

class MiddlewareConfig {
  constructor(actions, exec, apiComposerInstance = null, isPolicy = false) {
    this.actions = actions
    this.exec = exec
    this.isPolicy = isPolicy
    this._except = []
    this._only = []
    this._apiComposerInstance = apiComposerInstance
  }

  except(names) {
    this._except.push(...arrayfy(names))
    return this._apiComposerInstance
  }

  only(names) {
    this._only.push(...arrayfy(names))
    return this._apiComposerInstance
  }

  beforeSync(middlewares) {
    return this._apiComposerInstance.applyMiddlewares(middlewares, 'before', 'sync')
  }

  afterSync(middlewares) {
    return this._apiComposerInstance.applyMiddlewares(middlewares, 'after', 'sync')
  }

  beforeAsync(middlewares) {
    return this._apiComposerInstance.applyMiddlewares(middlewares, 'before', 'async')
  }

  afterAsync(middlewares) {
    return this._apiComposerInstance.applyMiddlewares(middlewares, 'after', 'async')
  }
}

module.exports = MiddlewareConfig
