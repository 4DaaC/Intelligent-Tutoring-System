var config = require('./config');
var client = require('mysql').createClient(config.db);
var checkPermissions = require('./checkPermissions.js');

var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;

module.exports = function(app) {
  app.get('/admin', function(req, res) {
    checkPermissions(req.session.user, {add_user: true}, res, function(err) {
      res.render('control_panel', {
        title: 'Admin Panel'
      });
    });
  });

  app.post('/addUser', validateAddUser);
  app.post('/addUser', function(req, res) {
    checkPermissions(req.session.user, {add_user: true}, res, function(err) {
      addUser(req.body.user, req.body.auth, function(err) {
        if(err) {
          req.flash("error", err);
          res.redirect('back');
        }
        else {
          res.redirect('/users');
        }
      });
    });
  });

  app.get('/remUser', validateRemoveUser);
  app.get('/remUser', function(req, res) {
    checkPermissions(req.session.user, {remove_user: true}, res, function(err) {
      removeUser(req.query.uid, function(err) {
        if(err) console.log(err);
        res.redirect('/users');
      });
    });
  });

  app.post('/updateUser', validateUpdateUser);
  app.post('/updateUser', function(req, res) {
    checkPermissions(req.session.user, {update_user_level: true}, res, function(err) {
      for(var uname in req.body) {
        updateUser(uname, req.body[uname]);
      }
      res.redirect('/users');
    }); 
  }); 

  app.get('/users', function(req, res) {
    checkPermissions(req.session.user, {view_all_users: true}, res, function(err) {
      var qString = "select * from Users";
      client.query(qString, function(err,results,fields) {
        console.log('render');
        res.render('users', {
          title: 'Users',
          users: results
        });
      });
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
