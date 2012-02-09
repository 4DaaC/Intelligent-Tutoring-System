var Browser = require("zombie");
var assert = require("assert");
var port = require("../server/config.js").port;

exports.login = login;
exports.assertUserCanLoadPage = assertUserCanLoadPage;

function login(name, next) {
  browser = new Browser({
    debug: false,
    site:"http://itutor.radford.edu:" + port
  });
  browser.visit("test-login/", function() {
    browser.fill("username", name);
    browser.pressButton("Login", function() {
      browser.wait( next(undefined, browser) );
    });
  });
}

function assertUserCanLoadPage(user, url, expectedResult, next) {
  login(user, function(err, browser) {
    browser.visit(url, function() {
      assert.equal(browser.success, expectedResult);
      next();
    });
  });
}
