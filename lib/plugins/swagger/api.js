const fs = require('fs')
const API = require('../../api')
const {
  normalizePath, guessMethod, guessType
} = require('../../helpers')

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

const generateTypeObject = (currentType, schemas) => {
  const result = {
    type: 'object'
  }
  const properties = {}

  const setPropertyType = (typeName, key) => {
    switch (typeName) {
      case 'MongoId':
      case 'String':
        properties[key] = {
          type: 'string'
        }
        break
      case 'Date':
        properties[key] = {
          type: 'string',
          format: 'date-time'
        }
        break
      case 'Number':
      case 'Float':
        properties[key] = {
          type: 'number'
        }
        break
      case 'Boolean':
        properties[key] = {
          type: 'boolean'
        }
        break
    }
  }
  const fields = currentType._gqcFields || currentType._fields
  Object.keys(fields).map(key => {
    const value = fields[key]
    const { description, type } = value
    const { _gqType, ofType } = type
    if (_gqType && _gqType.name) {
      const typeName = _gqType.name
      setPropertyType(typeName, key)

      if (_gqType._values) {
        properties[key] = {
          type: 'string',
          enum: _gqType._values.map(i => i.value)
        }
      }

      if (_gqType._fields) {
        properties[key] = generateTypeObject(_gqType, schemas)
      }
    } else if (ofType && ofType._gqcFields) {
      schemas[key] = generateTypeObject(ofType, schemas)
      properties[key] = {
        type: 'array',
        items: {
          $ref: `#/definitions/${key}`
        }
      }
    } else if (type.name) {
      setPropertyType(type.name, key)
    }

    if (description && properties[key]) {
      properties[key].description = description
    }
  })
  result.properties = properties
  return result
}

const generateSchemaType = function(resolver, schemas) {
  let type = resolver._type
  if (type === 'JSON') {
    return null
  }
  let isArray = false

  if (type.startsWith('[') && type.endsWith(']')) {
    type = type.replace('[', '').replace(']', '')
    isArray = true
  }
  let currentType = guessType(type)
  if (currentType.length > 0) {
    currentType = currentType[0]
  }

  const schema = generateTypeObject(currentType, schemas)
  schemas[type] = schema

  return {
    200: {
      description: '',
      schema: isArray
        ? { type: 'array', items: { $ref: `#/definitions/${type}` } }
        : { $ref: `#/definitions/${type}` }
    }
  }
}

API.macro('generateSwagger', function ({
  data,
  openApiVersion = '2.0',
  filePath
} = {}) {
  const swagger = {
    swagger: openApiVersion,
    ...data,
    paths: {}
  }

  const schemas = swagger.definitions || {}
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
            $ref: '#/definitions/Error'
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
    const isEnable = resolver._doc && resolver._doc.enable === false
    if (!resolver._isGraphqlOnly && !isEnable) {
      const method = guessMethod(resolver._methods)
      const path = normalizePath(resolver._path)

      if (!swagger.paths[path]) {
        swagger.paths[path] = {}
      }

      const result = generateSchemaType(resolver, schemas)
      if (result) {
        doc.responses = result
        if (data.errors) {
          doc.responses = { ...doc.responses, ...data.errors }
        }
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
  swagger.definitions = schemas

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
