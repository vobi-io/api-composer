'use strict'

const ApiResponse = require('app/utils/api-response')

class User {
  me ({ context: { user }}) {
    console.log(user)
    // return new ApiResponse({
    //   name: 'ok',
    //   data: user,
    // })
    return user
  }
}

module.exports = User
