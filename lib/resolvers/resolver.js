
class Resolver {
  constructor(name) {
    this._name = name
  }

  getName () {
    return this._name
  }

  static getInstance() {
    return new this()
  }
}

module.exports = Resolver
