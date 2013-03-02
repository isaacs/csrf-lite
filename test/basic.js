var tap = require('tap');
var test = tap.test
var request = require('request')

var PORT = 1337;
var csrf = require('../');
var Cookies = require('cookies');
var qs = require('querystring');
var http = require('http');

var server = http.createServer(function (req, res) {
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
})

tap.tearDown(function(t) {
  server.close();
});

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
    data = qs.parse(data);

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

test('start listening', function(t) {
  server.listen(PORT, function() {
    t.pass('listening');
    t.end();
  });
});

var jar = request.jar();
var token = null;
var before = '<html><form method=post>' +
             '<label>Name <input name=name></label>' +
             '<input type=hidden name=x-csrf-token value="'
var after = '"><input type=submit value=GO></form></html>'

test('get form (sets cookie)', function(t) {
  request('http://localhost:1337', function (er, res, body) {
    if (er)
      throw er
    t.ok(jar.cookies[0].value);
    token = jar.cookies[0].value;
    t.equal(body, before + token + after);
    t.end();
  }).jar(jar);
});

test('post form (with cookie)', function(t) {
  var d = qs.encode({ name: 'node', 'x-csrf-token': token });
  var req = { url: 'http://localhost:1337', body: d };
  request.post(req, function (er, res, body) {
    if (er)
      throw er
    t.equal(jar.cookies[0].value, token);
    t.equal(res.statusCode, 200);
    t.equal(body, 'ok\n');
    t.end();
  }).jar(jar);
});

var jar2 = request.jar();
test('post form (no csrf cookie)', function (t) {
  var d = qs.encode({ name: 'node', 'x-csrf-token': token });
  var req = { url: 'http://localhost:1337', body: d };
  request.post(req, function (er, res, body) {
    if (er)
      throw er
    t.notEqual(jar2.cookies[0].value, token);
    t.equal(res.statusCode, 403);
    t.equal(body, 'csrf detected!\n');
    t.end();
  }).jar(jar2);
});

test('post form (bad csrf cookie)', function(t) {
  var d = qs.encode({ name: 'node', 'x-csrf-token': token });
  var req = { url: 'http://localhost:1337', body: d };
  request.post(req, function (er, res, body) {
    if (er)
      throw er
    t.notEqual(jar2.cookies[0].value, token);
    t.equal(res.statusCode, 403);
    t.equal(body, 'csrf detected!\n');
    t.end();
  }).jar(jar2);
});

test('pull token off of data when validating', function(t) {
  var data = { 'x-csrf-token': '1234', ok: 'maybe' }
  var valid = csrf.validate(data, '1234')
  t.ok(valid)
  t.same(data, { ok: 'maybe' })
  t.end()
})
