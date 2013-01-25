module.exports = csrf

var crypto = require('crypto')

// call this with your token, or it'll make a new one.
function csrf(token) {
  if (token && typeof token === 'string')
    return token

  return crypto.randomBytes(24).toString('base64');
}

csrf.html = function (token) {
  // bogus token = no html.
  // typically, this will result in a failure when the form is posted.
  if (!token || typeof token !== 'string') {
    console.error('WARNING: csrf.html called with no token');
    return ''
  }

  token = token.replace(/"/g, '&quot;')
  return '<input type=hidden name=x-csrf-token value="' + token + '">'
}

csrf.valid = csrf.validate = function (data, token) {
  if (!token || typeof token !== 'string')
    return false

  return data['x-csrf-token'] === token
}
