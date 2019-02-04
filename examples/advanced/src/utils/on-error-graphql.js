const ApiError = require('app/utils/api-error')
const responses = require('app/utils/responses')

'use strict'

const onErrorGraphql = err => {
  if (err.originalError instanceof ApiError && err.originalError.extra) {
    const errorWithExtensions = {
      ...err,
    }
    if (err.originalError.extra.name) {
      const error = responses[err.originalError.extra.name]
      if (error) {
        errorWithExtensions.extensions = {
          ...error,
          message: err.message,
        }
      }
    }
    return errorWithExtensions
  }
  
  return err
}

module.exports = onErrorGraphql
