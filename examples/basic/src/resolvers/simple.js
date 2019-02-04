'use strict'

class Simple {
  async hello ({ args: { name } }) {
    return name
  }

  async before1 () {
    console.log('before 1: ra xdeba?')
  }

  async simpleMutation () {
    return {
      name: 'Koka',
      value: 13
    }
  }
}

module.exports = Simple
