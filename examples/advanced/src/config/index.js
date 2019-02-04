module.exports = {
  database: {
    connection: 'mongodb://localhost:27017/api-composer-example'
  },
  jwt: {
    secret: 'THIS-IS-NOT-SECRET-DO-NOT-USE-THIS-IN-PRODUCTION',
    algorithm: 'HS256',
    issuer: 'vobi',
    audience: 'vobi',
  }
}
