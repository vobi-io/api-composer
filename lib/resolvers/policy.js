
class Policy {
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

module.exports = Policy
