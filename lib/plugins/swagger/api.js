const fs = require('fs')
const API = require('../../api')
const { normalizePath, guessMethod, prepareArgs, generateFieldsSelection, capitalize } = require('../../helpers')

const convertGqlType = type =>
  type.replace('!', '').toLowerCase()

const generateParameters = function(args) {
  const params = []

  Object.keys(args).forEach(arg => {
    const type = args[arg]
    if (typeof type !== 'object') {
      params.push({
        "name": arg,
        "in": "path",
        "required": !!type.endsWith('!'),
        "type": convertGqlType(type),
        "description": "Description of " + arg + "..."
      })
    }
  })

  return params
}

API.macro('generateSwagger', function ({
  info,
  openApiVersion = "2.0",
  format = 'json',
  filePath,
} = {}) {
  const swagger = {
    swagger: openApiVersion,
    info: info || {},
    paths: {}
  }

  for (const resolver of this._resolvers.values()) {
    if (!resolver._isGraphqlOnly) {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      if (!swagger[path]) {
        swagger[path] = {}
      }

      swagger[path][method] = {
        operationId: resolver._name,
        summary: "Summary of " + resolver._name + "...",
        description: "Description of " + resolver._name + "...",
        consumes: [
          "application/json"
        ],
        produces: [
          "application/json"
        ],
        parameters: resolver._args ? generateParameters(resolver._args) : {}
      }

    }
  }

  if (filePath) {
    fs.writeFile(filePath, JSON.stringify(swagger, null, 2), 'utf8',  (err) => {
      if (err) {
        console.log("Could not write swagger json to " + filePath, 'error: ', err);
      } else {
        console.log("Successfully Written to " + filePath);
      }
    })
  }
})

module.exports = API
