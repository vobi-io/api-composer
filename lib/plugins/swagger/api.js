const fs = require('fs')
const API = require('../../api')
const { normalizePath, guessMethod, prepareArgs, generateFieldsSelection, capitalize } = require('../../helpers')

const convertGqlType = type =>
  type.replace('!', '').toLowerCase()

const generateParameters = function(resolver) {
  const { _args: args, _kind } = resolver
  const params = []

  if (args) {
    const inValue = _kind === 'mutation' ? 'body' : 'query'
    Object.keys(args).forEach(arg => {
      const type = args[arg]
      if (typeof type !== 'object') {
        params.push({
          name: arg,
          in: inValue,
          required: !!type.endsWith('!'),
          type: convertGqlType(type),
          description: 'Description of ' + arg + '...'
        })
      }
    })
  }

  return params
}

API.macro('generateSwagger', function ({
  data,
  openApiVersion = '2.0',
  format = 'json',
  filePath
} = {}) {
  const swagger = {
    swagger: openApiVersion,
    ...data,
    paths: {}
  }

  const defaultResponses = {
    200: {
      description: '',
      content: {
        'application/json': {
        }
      }
    },
    default: {
      description: 'Unexpected error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error'
          }
        }
      }
    }
  }
  for (const resolver of this._resolvers.values()) {
    let doc = {}
    if (resolver._doc) {
      doc = resolver._doc
    }
    if (!resolver._isGraphqlOnly) {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      if (!swagger.paths[path]) {
        swagger.paths[path] = {}
      }

      swagger.paths[path][method] = {
        operationId: resolver._name,
        summary: doc._displayName,
        description: doc.description,
        consumes: [
          'application/json'
        ],
        produces: [
          'application/json'
        ],
        parameters: doc.parameters || generateParameters(resolver),
        responses: doc.responses || defaultResponses
      }
    }
  }

  if (filePath) {
    fs.writeFile(filePath, JSON.stringify(swagger, null, 2), 'utf8', (err) => {
      if (err) {
        console.log(err)
      } else {
        console.log('Successfully Written to File.')
      }
    })
  }
})

module.exports = API
