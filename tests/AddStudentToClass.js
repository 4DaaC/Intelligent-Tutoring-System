var login = require("./commonFunctions.js").login;
var assertUserCanLoadPage = require("./commonFunctions.js").assertUserCanLoadPage;
var assert = require("assert");
var userF = require("./userFunctions.js");
var Step = require("step");

function isStudentInClass(name, className, next) {
  browser.visit("classes", function() {
    var url = browser.querySelector("a:contains('" + className + "')").href;
    browser.visit(url, function() {
      var td = browser.querySelector("td:contains('" + name + "')");
      next(undefined, td != undefined && name == td.innerHTML);
    });
  });
}
function removeStudentFromClass(studentID, classID, next) {
  browser.visit("quizzes?cid=" + classID, function() {
    browser.clickLink("a[href='/remStud?cid=" + classID + "&uid=" + studentID + "']", next);
  });
}

Step(
  function adminAddsStudentToClass() {
    console.log("TEST: Admin adds student to class");
    var next = this;
    var name = "teststudent";
    var className = "testclass";
    login("testadmin", function(err, browser) {
      browser.visit("student", function() {
        var classID = browser.querySelector("option:contains('" + className + "')").value;
        browser
          .select("cid", classID)
          .select("user", name)
          .pressButton("Add", function() {
            assert.ok(browser.success);
            isStudentInClass(name, className, function(err, inClass) {
              assert.ok(inClass);
              userF.getIDOfUser(name, function(err, userID) {
                removeStudentFromClass(userID, classID, next);
              });
            });
          });
      });
    });
  },
  function professorAddsStudentToClass() {
    console.log("TEST: Professor adds student to class");
    var next = this;
    var name = "teststudent";
    var className = "testclass";
    login("testprof", function(err, browser) {
      browser.visit("student", function() {
        var classID = browser.querySelector("option:contains('" + className + "')").value;
        browser
          .select("cid", classID)
          .select("user", name)
          .pressButton("Add", function() {
            assert.ok(browser.success);
            isStudentInClass(name, className, function(err, inClass) {
              assert.ok(inClass);
              userF.getIDOfUser(name, function(err, userID) {
                removeStudentFromClass(userID, classID, next);
              });
            });
          });
      });
    });
  },
  function studentTriesToAddStudentToClass() {
    console.log("TEST: Student tries to add student to class");
    assertUserCanLoadPage("testuser", "student", false, this);
  },
  function success() {
    console.log("ALL TESTS SUCCESSFUL");
  }
)
