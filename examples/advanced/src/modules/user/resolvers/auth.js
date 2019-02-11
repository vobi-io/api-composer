'use strict'

const UserModel = require('app/modules/user/user')
const JwtService = require('app/services/jwt-service')
const config = require('app/config')
const { generateHash, apiErrors } = require('app/utils')

const jwt = new JwtService(config.jwt)

class Auth {
  async isAuthorized ({ context }) {
    if (!context.user) {
      return apiErrors.unauthorized('User not authorized')
    }
  }

  async signUp ({ args: { record: { firstName, lastName, email, password } } }) {
    const emailExists = await UserModel.checkIfEmailExist(email)
    if (emailExists) {
      return apiErrors.conflict('Email already exists')
    }

    const user = new UserModel({
      email,
      password: generateHash(password),
      firstName,
      lastName,
    })

    await user.save()

    const accessToken = jwt.sign({ id: user.id })

    return {
      accessToken: accessToken,
    }
  }

  async signIn ({ args: { record: { email, password } } }) {
    const user = await UserModel.findOneByEmail(email)

    if (!user) {
      return apiErrors.notFound('The email doesn’t match any account or not active.')
    }

    if (!user.validatePassword(password)) {
      return apiErrors.notFound('The password you’ve entered is incorrect.')
    }

    const accessToken = jwt.sign({ id: user.id })

    return {
      accessToken: accessToken
    }
  }
}

module.exports = Auth
