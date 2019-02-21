'use strict'

const ApiComposer = require('./api-extended')

const mergeApis = (apiComposers, baseApiComposer) => {
  if (!Array.isArray(apiComposers)) {
    throw new TypeError('You must provide an array of api-composers')
  }

  const resolvers = apiComposers
    .reduce(
      (resolvers, apiComposer) => new Map([
        ...resolvers,
        ...apiComposer.getResolvers()
      ]),
      new Map()
    )

  const apiComposer = baseApiComposer || new ApiComposer()

  apiComposer.setResolvers(resolvers)

  return apiComposer
}

module.exports = mergeApis
