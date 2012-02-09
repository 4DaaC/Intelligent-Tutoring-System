var login = require("./commonFunctions.js").login;
var assertUserCanLoadPage = require("./commonFunctions.js").assertUserCanLoadPage;
var userF = require("./userFunctions.js");
var assert = require("assert");
var Step = require("step");


Step(
  function adminOpensAddForm() {
    console.log("TEST: Admin opens add form");
    assertUserCanLoadPage("testadmin", "admin", true, this);
  },
  function submitFormWithValidData() {
    console.log("TEST: Submit form with valid data");
    var next = this;
    var name = "namefortesting";
    var type = "admin";
    login("testadmin", function(err, browser) {
      userF.addUser(name, type, function() {
        assert.ok(browser.success, "Failed to add user");
        userF.checkIfUserExists(name, type, function(err, doesExist) {
          assert.ok(doesExist);
          userF.removeUser(name, next);
        });
      });
    });
  },
  function userLeavesUserNameBlank() {
    console.log("TEST: User leaves user name blank");
    var next = this;
    login("testadmin", function(err, browser) {
      browser.visit("admin", function() {
        browser.pressButton("Add", function() {
          var error = browser.querySelector("ul#error-box:contains(Username must be between 1 and 20 characters long)");
          assert.ok(error);
          next();
        });
      });
    });
  },
  function userTriesToAddNameThatIsTooLong() {
    console.log("TEST: User enters user name that is too long(21 chars)");
    var next = this;
    var name = "123456789012345678901";
    var type = "admin";
    login("testadmin", function(err, browser) {
      userF.addUser(name, type, function() {
        assert.ok(browser.success, "Failed to add user");
        userF.checkIfUserExists(name, type, function(err, doesExist) {
          assert.ok(!doesExist);
          next();
        });
      });
    });
  },
  function userTriesToAddDuplicateName() {
    console.log("TEST: User tries to add a duplicate username");
    var next = this;
    var name = "testname";
    var type = "admin";
    login("testadmin", function(err, browser) {
      userF.addUser(name, type, function() {
        userF.addUser(name, type, function() {
          var error = browser.querySelector("ul#error-box:contains(Duplicate entry)");
          assert.ok(error);
          userF.removeUser(name, function() {
            next();
          });
        });
      });
    });
  },
  function proffesorOpensForm() {
    console.log("TEST: Professor tries to access add admin form");
    assertUserCanLoadPage("testprof", "admin", false, this);
  },
  function studentOpensForm() {
    console.log("TEST: Student tries to access add admin form");
    assertUserCanLoadPage("teststudent", "admin", false, this);
  },
  function success() {
    console.log("ALL TESTS SUCCESSFUL");
  }
);
