'use strict'

const responses = require('app/utils/responses')

const prepareResponse = 
  (name, extra) => {
    const response = responses[name]
    if (!response) {
      throw new Error('Invalid response name')
    }

    return {
      ...response,
      ...extra,
    }
  }

module.exports = prepareResponse
