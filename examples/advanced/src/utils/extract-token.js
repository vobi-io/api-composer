'use strict'

const AUTH_HEADER = 'authorization'
const DEFAULT_TOKEN_BODY_FIELD = 'access_token'
const DEFAULT_TOKEN_QUERY_PARAM_NAME = 'access_token'

// Extract the jwt token from the request's header, body or query
const extractToken =
  req => {
    if (req.headers[AUTH_HEADER]) {
      return req.headers[AUTH_HEADER]
    }

    if (req.body[DEFAULT_TOKEN_BODY_FIELD]) {
      return req.body[DEFAULT_TOKEN_BODY_FIELD]
    }

    return req.query[DEFAULT_TOKEN_QUERY_PARAM_NAME]
  }

module.exports = extractToken
