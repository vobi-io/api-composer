'use strict'

const responses = require('app/utils/responses')
const ApiError = require('app/utils/api-error')
const prepareResponse = require('./prepare-response')

const onErrorExpress = (err, res) => {
  if (err instanceof ApiError) {
    if (err.extra.status) {
      res.status(err.extra.status)
    }
    res.json({
      ...err.extra,
      message: err.message,
    })
    return
  }
  console.log(err)

  res.status(500)
  res.json({
    ...responses.serverError,
    message: err.message,
  })
}

module.exports = onErrorExpress
