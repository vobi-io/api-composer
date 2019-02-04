'use strict'

const bcrypt = require('bcrypt-nodejs')

const generateHash =
  password =>
    bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)

module.exports = generateHash
