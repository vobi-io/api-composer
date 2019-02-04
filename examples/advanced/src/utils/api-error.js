'use strict'

class ApiError extends Error {
  constructor(message, extra) {
    super(message)
    this.name = this.constructor.name
    this.extra = extra
    Error.captureStackTrace(this, ApiError)
  }
}

module.exports = ApiError
