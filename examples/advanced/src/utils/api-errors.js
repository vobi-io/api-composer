'use strict'

const responses = require('./responses')
const ApiError = require('./api-error')

const errorToResponse =
  errName =>
    message => {
      const response = responses[errName]
      const apiError = new ApiError(message, response)
      return Promise.reject(apiError)
    }

const apiErrors = {}
Object
  .keys(responses)
  .forEach(errName => {
    apiErrors[errName] = errorToResponse(errName)
  })

module.exports = apiErrors
