const path = require('path')
const { ApiComposer } = require('@vobi/api-composer')

const api = new ApiComposer()

api.setResolversPath(path.resolve(__dirname, 'resolvers'))

api.createType('mutationType', {
  a: 'String',
  b: 'String'
})

api.query('me', async () => 'ME!')

api
  .mutation('simpleMutation')
  .resolve('simpleMutation')
  .args({
    arg1: 'String!'
  })
  .type('mutationType')

module.exports = {
  koaRouter: api.getKoaRouter(),
  graphqlSchema: api.getGraphqlSchema()
}
