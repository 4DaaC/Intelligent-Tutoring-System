exports.addUser = addUser;
exports.checkIfUserExists = checkIfUserExists;
exports.removeUser = removeUser;
exports.getIDOfUser = getIDOfUser;

function addUser(name, type, next) {
  browser.visit("admin", function() {
    var nType;
    if(type == "admin") {
      nType = 2; 
    }
    else if(type == "professor") {
      nType = 1;
    }
    else if(type == "student") {
      nType = 0;
    }
    browser
      .fill("user", name)
      .choose(nType)
      .pressButton("Add", function() {
        next(undefined, browser.success);
      });
  });
}

function checkIfUserExists(name, type, next) {
  browser.visit("users", function() {
    var row = browser.querySelector("select[name=" + name + "]").parentNode.parentNode;
    var userLevel = row.querySelector("option[selected=true]").innerHTML;
    next(undefined, userLevel.toLowerCase() == type);
  });
}

function removeUser(name, next) {
  browser.visit("users", function() {
    var row = browser.querySelector("select[name=" + name + "]").parentNode.parentNode;
    browser.visit(row.querySelector("td a").href, function() {
      next(undefined, browser.success);
    });
  });
}

function getIDOfUser(name, next) {
  browser.visit("users", function() {
    var row = browser.querySelector("select[name=" + name + "]").parentNode.parentNode;
    var uid = row.querySelector("td:first").innerHTML;
    next(undefined, uid);
  });
}
