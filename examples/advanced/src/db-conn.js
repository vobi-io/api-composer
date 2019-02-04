const config = require('./config')
const mongoose = require('./db')(config.database.connection, 'Main')

module.exports = {
  mongoose
}
