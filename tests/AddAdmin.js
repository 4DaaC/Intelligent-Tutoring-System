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
    // Not yet implemented
    this();
  },
  function userTriesToAddDuplicateName() {
    // Not yet implemented
    this();
  },
  function proffesorOpensForm() {
    console.log("TEST: Professor tries to access add admin form");
    assertUserCanLoadPage("testprof", "admin", false, this);
  },
  function studentOpensForm() {
    console.log("TEST: Student tries to access add admin form");
    assertUserCanLoadPage("teststudent", "admin", false, this);
  },
  function userNameIsTooLong() {
    // Not yet implemented
    this();
  },
  function success() {
    console.log("ALL TESTS SUCCESSFUL");
  }
);
