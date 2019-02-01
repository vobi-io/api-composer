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
      console.log('req.query:', req.query)
      args.filter = req.query
    }

    if (req.body && Object.keys(req.body).length) {
      args.record = req.body
    }

    return args
  }

module.exports = {
  normalizePath,
  guessMethod,
  prepareArgs,
}