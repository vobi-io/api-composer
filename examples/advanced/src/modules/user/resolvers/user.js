'use strict'

// const ApiResponse = require('app/utils/api-response')
const UserModel = require('app/modules/user/user')

class User {
  me ({ context: { user }}) {
    // return new ApiResponse({
    //   name: 'ok',
    //   data: user,
    // })
    return user
  }

  findMany ({ args: { filter } }) {
    return UserModel
      .find(filter)
      .exec()
  }
}

module.exports = User
