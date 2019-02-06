const path = require('path')
const { ApiComposer } = require('@vobi/api-composer')

const api = new ApiComposer()

api.setResolversPath(path.resolve(__dirname, 'resolvers'))

api.query('me', 'me')

module.exports = {
  koaRouter: api.getKoaRouter()
}