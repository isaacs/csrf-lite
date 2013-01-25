# csrf-lite

CSRF protection utility for framework-free node sites.

## Usage

```javascript
var csrf = require('csrf-lite');
var Cookies = require('cookies');
var qs = require('querystring');

http.createServer(function (req, res) {
  var c = new Cookies(req, res);

  // use the session id as the token
  var token = c.get('sessid');

  // if the user doesn't have one, then give them one.
  // it's just a random string anyway.
  if (!token) {
    token = csrf(token);
    c.set('sessid', token);
  }

  switch (req.method) {
    case 'GET': return showForm(req, res, token);
    case 'POST': return validForm(req, res, token);
  }
}).listen(PORT)

function showForm(req, res, token) {
  res.end('<html><form method=post>' +
          '<label>Name <input name=name></label>' +
          // add the csrf token html
          csrf.html(token) +
          '<input type=submit value=GO>' +
          '</form></html>');
}

function validForm(req, res, token) {
  // note: this won't work for 
  req.setEncoding('utf8');
  var data = '';
  req.on('data', function(c) {
    data += c;
  });
  req.on('end', function() {
    data = querystring.parse(data);

    // validate with the user's token
    var valid = csrf.validate(data, token);
    if (valid)
      res.end('ok\n');
    else {
      res.statusCode = 403;
      res.end('csrf detected!\n');
    }
  });
}
```

## csrf(token)

If a token is supplied, then returns it.  If not, then it generates a
192-bit random string and returns that.

Make sure that you stash the token somewhere like a session or
something, so that it can be retrieved later.

## csrf.html(token)

Returns an `<input>` field containing the token, for csrf validation
in forms.

If no token is provided, then it returns nothing.

## csrf.validate(data, token)

Validates that the `x-csrf-token` field is equal to the token.  Call this
with the parsed form data on the other side.  Can also be used on
request headers, query string, or any other random data.
