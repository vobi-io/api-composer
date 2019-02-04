const jwt = require('jsonwebtoken')

class JwtService {
  constructor({ secret, algorithm, issuer, audience }) {
    this.secret = secret
    this.algorithm = algorithm
    this.issuer = issuer
    this.audience = audience
  }
  
  sign (payload) {
    return jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      issuer: this.issuer,
      audience: this.audience
    })
  }

  decode (token) {
    return jwt.decode(token, { complete: true })
  }

  verify (token) {
    return jwt.verify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience
    })
  }
}

module.exports = JwtService
