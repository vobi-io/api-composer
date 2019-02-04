'use strict'

const responses = {
  ok: {
    status: 200,
    name: 'ok',
    code: 'OK',
    message: 'Operation is successfully executed',
  },
  created: {
    status: 201,
    name: 'created',
    code: 'CREATED',
    message: 'The request has been fulfilled and resulted in a new resource being created',
  },
  redirectStatus: {
    status: 301,
    name: 'redirectStatus',
    code: 'REDIRECT',
    message: 'Success should be redirected',
  },
  badRequest: {
    status: 400,
    name: 'badRequest',
    code: 'E_BAD_REQUEST',
    message: 'The request cannot be fulfilled due to bad syntax',
  },
  tokenExpired: {
    status: 401,
    name: 'tokenExpired',
    code: 'EXPIRED_TOKEN',
    message: 'Token has been expired',
  },
  unauthorized: {
    status: 401,
    name: 'unauthorized',
    code: 'E_UNAUTHORIZED',
    message: 'Missing or invalid authentication token',
  },
  forbidden: {
    status: 403,
    name: 'forbidden',
    code: 'E_FORBIDDEN',
    message: 'User not authorized to perform the operation',
  },  
  notActiveUser: {
    status: 403,
    name: 'notActiveUser',
    code: 'E_NOT_ACTIVE',
    message: 'User account is not active',
  },  
  notFound: {
    status: 404,
    name: 'notFound',
    code: 'E_NOT_FOUND',
    message: 'The requested resource could not be found but may be available again in the future',
  },
  conflict: {
    status: 409,
    name: 'conflict',
    code: 'CONFLICT',
    message: 'Duplicate item',
  },
  serverError: {
    status: 500,
    name: 'serverError',
    code: 'E_INTERNAL_SERVER_ERROR',
    message: 'Something bad happened on the server',
  },
}

module.exports = responses
