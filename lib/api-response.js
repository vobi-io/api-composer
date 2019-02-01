'use strict'

class ApiResponse {
  constructor({ payload, statusCode }) {
    this.payload = payload
    this.statusCode = statusCode
  }
}

module.exports = ApiResponse
