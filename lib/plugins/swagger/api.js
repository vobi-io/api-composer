const fs = require('fs')
const API = require('../../api')
const {
  normalizePath, guessMethod, guessType
} = require('../../helpers')
const {
  schemaComposer
} = require('graphql-compose')

const convertGqlType = type => {
  let result = {}
  const typeName = type.replace('!', '')
  switch (typeName) {
    case 'MongoID':
    case 'MongoId':
    case 'String':
      result = {
        type: 'string'
      }
      break
    case 'Date':
      result = {
        type: 'string',
        format: 'date-time'
      }
      break
    case 'Int':
      result = {
        type: 'integer'
      }
      break
    case 'Number':
      result = {
        type: 'number',
        format: 'float'
      }
      break
    case 'Float':
      result = {
        type: 'number',
        format: 'float'
      }
      break
    case 'Boolean':
      result = {
        type: 'boolean'
      }
      break
    default:
      try {
        const tcType = schemaComposer.getAnyTC(typeName)
        if (tcType && tcType._gqType && tcType._gqType._values) {
          result = {
            type: 'string',
            enum: tcType._gqType._values.map(i => i.name)
          }
        }
      } catch (err) { console.log(err) }
      // todo nested object types for args
      break
  }

  return result
}
const generateParameters = function(resolver, schemas) {
  const { _args: args, _kind, _name } = resolver
  const params = []
  const properties = { }

  if (args) {
    const inValue = _kind === 'mutation' ? 'body' : 'query'

    Object.keys(args).forEach(key => {
      const arg = args[key]
      const inType = arg.in || inValue
      const description = arg.description || 'Description of ' + key + '...'
      const type = arg.type || arg

      if (inType === 'body') {
        properties[key] = convertGqlType(type)
      } else {
        if(type.endsWith){
          params.push({
            name: key,
            in: inType,
            required: !!type.endsWith('!'),
            ...convertGqlType(type),
            description
          })
        }       
      }
    })

    if (Object.keys(properties).length) {
      schemas[_name] = {
        type: 'object',
        properties
      }
      params.push({
        name: 'body',
        in: 'body',
        schema: {
          $ref: `#/definitions/${_name}`
        }
      })
    }

    params.push({
      name: 'fieldsSelection',
      in: 'query',
      required: false,
      type: 'string',
      description: 'field selections. example: { _id creator}'
    })
  }

  return params
}

const generateTypeObject = (currentType, schemas) => {
  const result = {
    type: 'object'
  }
  const properties = {}

  const setPropertyType = (typeName, key, checkTC) => {
    switch (typeName) {
      case 'MongoID':
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
      case 'Int':
        properties[key] = {
          type: 'integer'
        }
        break
      case 'Number':
        properties[key] = {
          type: 'number',
          format: 'float'
        }
        break
      case 'Float':
        properties[key] = {
          type: 'number',
          format: 'float'
        }
        break
      case 'Boolean':
        properties[key] = {
          type: 'boolean'
        }
        break
      default:
        try {
          if (checkTC) {
            const tcType = schemaComposer.getAnyTC(typeName)
            if (tcType) {
              // if (key === 'status') {
              //   console.log(12)
              // }
              if (tcType._gqType && tcType._gqType._values) {
                properties[key] = {
                  type: 'string',
                  enum: tcType._gqType._values.map(i => i.value)
                }
              } else {
                // properties[key] = generateTypeObject(tcType, schemas)
                schemas[key] = generateTypeObject(tcType, schemas)
                properties[key] = {
                  $ref: `#/definitions/${key}`
                }
              }
            }
          }
        } catch (err) { console.log(err) }
        // todo nested object types for args
        break
    }
  }
  const fields = currentType._gqcFields || currentType._fields
  if (fields) {
    Object.keys(fields).map(key => {
      const value = fields[key]
      const { description, type } = value

      if (type) {
        const { _gqType, ofType } = type

        if (_gqType && _gqType.name) {
          const typeName = _gqType.name
          setPropertyType(typeName, key, false)

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
        } else if (ofType && ofType._gqType && ofType._gqType.name === 'MongoID') {
          setPropertyType(ofType._gqType.name, key, true)
        } else if (type.name) {
          setPropertyType(type.name, key, true)
        }

        if (description && properties[key]) {
          properties[key].description = description
        }
      }
    })
  }
  result.properties = properties
  return result
}

const generateSchemaType = function(resolver, schemas) {
  let type = resolver._type
  // if (type === 'Invoice') {
  //   console.log(1)
  // }
  if (type === 'JSON') {
    return null
  }
  let isArray = false

  if (type.startsWith && type.startsWith('[') && type.endsWith(']')) {
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
  defaultErrors,
  openApiVersion = '2.0',
  filePath
} = {}) {
  try{
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

      let path = normalizePath(resolver._path)


      if(!resolver._args){
        resolver._args= {}
      }
      if(resolver._args){
        // if param is in path
        Object.keys(resolver._args).forEach(key => {
          const arg = resolver._args[key]

          if (arg.in === 'path') {
            path = path.replace(`:${key}`, `{${key}}`)
          }
        })
      }

      if (!swagger.paths[`"${path}"`]) {
        swagger.paths[path] = {}
      }

      const result = generateSchemaType(resolver, schemas)
      if (result) {
        doc.responses = result
        if (defaultErrors) {
          doc.responses = { ...doc.responses, ...defaultErrors }
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
        parameters: doc.parameters || generateParameters(resolver, schemas),
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
}catch(err){
  throw err
}
})

module.exports = API