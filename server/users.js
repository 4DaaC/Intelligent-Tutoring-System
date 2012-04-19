var config = require('./config');
var client = require('mysql').createClient(config.db);

var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;

exports.addUserForm = addUserForm;
exports.addUserSubmit = addUserSubmit;
exports.removeUserSubmit = removeUserSubmit;
exports.updateUserSubmit = updateUserSubmit;
exports.viewUsers = viewUsers;
exports.validateAddUser = validateAddUser;
exports.validateRemoveUser = validateRemoveUser;
exports.validateUpdateUser = validateUpdateUser;

// Routes
function addUserForm(req, res) {
  res.render('control_panel', {
    title: 'Admin Panel',
    layout:false
  });
}

function addUserSubmit(req, res) {
  addUser(req.body.user, req.body.auth, function(err) {
    if(err) {
      req.flash("error", err);
      res.redirect('back');
    }
    else {
      res.redirect('/users');
    }
  });
}

function removeUserSubmit(req, res) {
  removeUser(req.query.uid, function(err) {
    res.redirect('/users');
  });
}

function updateUserSubmit(req, res) {
  for(var uname in req.body) {
    updateUser(uname, req.body[uname]);
  }
  res.redirect('/users');
}

function viewUsers(req, res) {
  var qString = "select * from Users";
  client.query(qString, function(err,results,fields) {
    res.render('users', {
      title: 'Users',
      users: results
    });
  });
}

// Actions
function addUser(username, authLevel, next) {
  var qString = "INSERT INTO Users (username, auth_level) VALUES (?, ?)";
  client.query(qString, [username, authLevel], next);
}


function removeUser(userid, next) {
  var qString = "DELETE FROM Users WHERE uid = ?";
  client.query(qString, [userid], next);
}

function updateUser(username, level) {
  var level = level === 'Admin' ? ADMIN : (level === 'Professor' ? PROF : STUDENT);
  var qString = 'UPDATE Users SET auth_level = ? WHERE username = ?';
  client.query(qString, [level, username]);
}

// Validation
function validateAddUser(req, res, next) {
  var auth = parseInt(req.body.auth);
  var user = req.body.user;
  var foundErr = false;
  if(typeof(user) !== 'string' || user.length <= 1 || user.length >= 20){
    req.flash("error", "Username must be between 1 and 20 characters long");
    foundErr = true;
  }
  if(!(auth === 0 || auth === 1 || auth === 2)) {
    req.flash("error", "Authorization level setting is invalid");
    foundErr = true;
  }
  if(foundErr) {
    res.redirect('back');
  }
  else {
    next();
  }
}

function validateRemoveUser(req, res, next) {
  var uid = req.query.uid;
  qStr = 'SELECT uid FROM Users WHERE uid = ?';
  client.query(qStr, [uid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "User does not exist");
      res.redirect('back');
    }
    else {
      next();
    }
  });
}

function validateUpdateUser(req, res, next) {
  var foundErr = false;
  for(var uname in req.body) {
    var level = req.body[uname];
    var validLevels = ['Admin', 'Professor', 'Student'];
    if(validLevels.indexOf(level) === -1) {
      req.flash('error','Invalid user level chosen for ' + uname);
      foundErr = true;
    }
  }
  if(foundErr) {
    res.redirect('back');
  }
  else {
    next();
  }
}
