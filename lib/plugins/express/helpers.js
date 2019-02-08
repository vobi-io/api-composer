'use strict'

const normalizePath = 
  p => 
    p.charAt(0) === '/' 
      ? p 
      : `/${p}`

const guessMethod = 
  methods => {
    if (Array.isArray(methods) && methods.length > 0) {
      if (methods.length === 1) {
        return methods[0]
      }
      
      return 'all'
    }
    
    return 'get'
  }


const prepareArgs =
  req => {
    let args = {}

    if (req.params) {
      args = {
        ...req.params
      }
    }

    if (req.query && Object.keys(req.query).length) {
      args = {
        ...args,
        ...req.query,
      }
    }

    if (req.body && Object.keys(req.body).length) {
      args = {
        ...args, 
        ...req.body
      }
    }

    return args
  }

const buildQuery = 
  resolver =>
    fieldsSelection => {
      console.log(fieldsSelection)
      let query = ''
      let args = ''
      if (resolver._args) {
        args += '('
        Object.keys(resolver._args).forEach(key => {
          args += `${key}, `
        })
        args += ')'
      }
      let fieldsSelectionWithCurlyBraces = ''
      if (fieldsSelection) {
        fieldsSelectionWithCurlyBraces = `{ ${fieldsSelection} }`
      }
      query += `${resolver._kind} ${resolver._name}${args} {
        ${resolver._name}${fieldsSelectionWithCurlyBraces}
      }`

      return query
    }
      
module.exports = {
  normalizePath,
  guessMethod,
  prepareArgs,
  buildQuery,
}