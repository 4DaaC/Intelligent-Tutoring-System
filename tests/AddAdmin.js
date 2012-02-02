var login = require("./commonFunctions.js").login;
var assertUserCanLoadPage = require("./commonFunctions.js").assertUserCanLoadPage;
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
        login("testadmin", function(err, browser) {
            browser.visit("admin", function() {
                browser
                .fill("user", "testiss")
                .choose("2")
                .pressButton("Add", function() {
                    assert.ok(browser.success);
                    browser.visit("users", function() {
                        // Check that row for new user exists
                        var row = browser.document.querySelector("select[name=testiss]").parentNode.parentNode;
                        var userLevel = row.querySelector("option[selected=true]").innerHTML;
                        assert.equal(userLevel, "Admin");

                        // Clean by deleting test user
                        browser.visit(row.querySelector("td a").href);
                        next();
                    });
                })
            });
        });
    },
    function userLeavesUserNameBlank() {
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
