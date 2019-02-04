'use strict'

class ApiResponse {
  constructor({ name, message, data }) {
    if (!name || !data) {
      throw new Error('Name and data are required')
    }
    this.name = name
    this.message = message
    this.data = data
  }
}

module.exports = ApiResponse
