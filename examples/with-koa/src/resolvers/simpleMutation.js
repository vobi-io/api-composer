const simpleMutation = 
  ({ args: { arg1 }}) =>
    ({ 
      a: 'Simple Mutation: ',
      b: arg1 
    })

module.exports = simpleMutation
