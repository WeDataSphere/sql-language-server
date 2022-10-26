const path = require('path')

module.exports = {
  "postgres": {
    "username": "sqlls",
    "password": "sqlls",
    "database": "postgres_db",
    "host": "postgres",
    "dialect": "postgres"
  },
  "mysql": {
    "username": "root",
    "password": "root",
    "database": "test",
    "host": "192.168.146.146",
    "dialect": "mysql"
  },
  "sqlite": {
    "storage": path.join(__dirname, '..', 'sqlite_db.sqlite'),
    "dialect": "sqlite"
  }
}
