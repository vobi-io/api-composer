'use strict'

const ApiResponse = require('app/utils/api-response')
const responses = require('app/utils/responses')

const responseDecorator =
  (response, res) => {
    if (response instanceof ApiResponse) {
      const resp = responses[response.name]
      if (resp.status) {
        res.status(resp.status)
      }
      res.json({
        ...resp,
        ...response,
      })
      return
    }
    res.json(response)
  }

module.exports = responseDecorator
