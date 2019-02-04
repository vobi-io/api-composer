const config = require('../config')
const JwtService = require('../services/jwt-service')
const { extractToken } = require('../utils')
const UserModel = require('app/modules/user/user')

const jwt = new JwtService(config.jwt)

const authMiddleware = async (req, res, next) => {
  req.auth = {}
  
  const token = extractToken(req)

  if (!token) {
    req.auth.info = 'no-token'
    return next()
  }

  let payload
  try {
    payload = jwt.verify(token)
  } catch (e) {
    req.auth.info = 'invalid-token'
    return next()
  }

  try {
    const user = await UserModel.findById(payload.id)
    if (!user) {
      req.auth.info = 'user-not-found'
      return next()
    }

    req.user = user

    next()
  } catch (err) {
    res.serverError(err)
  }
}

module.exports = {
  authMiddleware
}
