//https://medium.com/@iaincollins/error-handling-in-javascript-a6172ccdf9af

class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.message = message
  }
}
class PermissionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PermissionError'
    this.message = message
  }
}
class DatabaseError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DatabaseError'
    this.message = message
  }
}
module.exports = {
  ValidationError,
  PermissionError,
  DatabaseError
}
