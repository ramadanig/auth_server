
require.paths.unshift(__dirname + '/..');
require.paths.unshift(__dirname + '/../../vendors/nodetk/src');

var auth_server = require('auth_server')
  , server = auth_server.server
  , assert = require('nodetk/testing/custom_assert')
  , extend = require('nodetk/utils').extend
  , querystring = require('querystring')
  ;



//--------------------------------------------------

var URL = require('url')
  , http = require('http');

var REQ = function(type, url, callback) {
  /* Make a request to the given URL, and call:
   *  callback(http_code, headers, data);
   */
  var purl = URL.parse(url);
  var client = http.createClient(purl.port || 80, purl.hostname);
  client.addListener('error', function(err) {
    console.log(err.message);
    console.log(err.stack);
  });
  var headers = {
    'host': purl.hostname,
    // We want to simulate a browser:
    'User-Agent': 'Mozilla/5.0 (X11; U; Linux i686; fr; rv:1.9.1.9) Gecko/20100401 Ubuntu/9.10 (karmic) Firefox/3.5.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'fr-fr,fr;q=0.8,en;q=0.5,en-us;q=0.3',
    //'Accept-Encoding': 'gzip,deflate',
  };
  var request = client.request(type, purl.pathname + purl.search, headers);
  request.end();
  var data = '';
  request.on('response', function(response) {
    response.setEncoding('utf8');
    response.on('data', function(chunk) {
      data += chunk;
    });
    response.on('end', function() {
      callback(response.statusCode, response.headers, data);
    });
  });
}

var GET = function(url, callback) {
  return REQ('GET', url, callback);
};

var POST = function(url, callback) {
  return REQ('POST', url, callback);
};
// ----------------------------------------------------------




server.serve(9999)
var authorize_url = 'http://127.0.0.1:9999/oauth/authorize';


var get_error_checker = function(error_code) {
  /* Returns a function checking the reply is an error.
   * Use assert two times.
   */
  return function(statusCode, headers, data) {
    assert.equal(statusCode, 200); // TODO: 400
    var error = JSON.parse(data);
    assert.deepEqual(error, {error: {
      type: 'OAuthException',
      message: error_code + ': ' + auth_server.ERRORS[error_code]
    }});
  };
};


exports.tests = [

['/oauth/authorize: missing mandatory param', 6, function() {
  // A missing mandatory param should give us an error.
  var qs = {
    client_id: "errornot",
    response_type: "token",
    redirect_uri: "http://127.0.0.1:8888/login"
  }
  auth_server.PARAMS.mandatory.forEach(function(param) {
    var partial_qs = extend({}, qs);
    delete partial_qs[param];
    partial_qs = querystring.stringify(partial_qs);
    GET(authorize_url +'?'+ partial_qs, get_error_checker('invalid_request'));
  });
}],


['/oauth/authorize: bad client_id', 2, function() {
  // if the given client id is not in DB, error.
  var qs = querystring.stringify({
    client_id: "toto",
    response_type: "token",
    redirect_uri: "http://127.0.0.1:8888/login"
  });
  GET(authorize_url +'?'+ qs, get_error_checker('invalid_client'));
}],

['/oauth/authorize: redirect_uri mismatch', 2, function() {
  // if the redirect_uri is not the same as registered: error.
  var qs = querystring.stringify({
    client_id: "errornot",
    response_type: "token",
    redirect_uri: "http://127.0.0.1:8888/login/wrong"
  });
  GET(authorize_url +'?'+ qs, get_error_checker('redirect_uri_mismatch'));
}],

['/oauth/authorize: unsupported_response_type', 2, function() {
  // if the response_type is not an accepted value: error.
  var qs = querystring.stringify({
    client_id: "errornot",
    response_type: "wrong",
    redirect_uri: "http://127.0.0.1:8888/login"
  });
  GET(authorize_url +'?'+ qs, get_error_checker('unsupported_response_type'));
}],


['/oauth/authorize: ok', 1, function() {
  // if the response_type is not an accepted value: error.
  var qs = querystring.stringify({
    client_id: "errornot",
    response_type: "token",
    redirect_uri: "http://127.0.0.1:8888/login"
  });
  GET(authorize_url +'?'+ qs, function(statusCode, headers, data) {
    assert.equal(statusCode, 200);
    // TODO: more checks here? -> check we have a form to log in.
  });
}],

]