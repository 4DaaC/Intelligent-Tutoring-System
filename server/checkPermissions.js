var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;
var async = require('async');
var config = require('./config');
var client = require('mysql').createClient(config.db);

var allowedProf = 'add_class';
var allowedStudent = '';

var checkPermissions = function(current_user, perms, callback) {
  var checks = [];
  var err;

  if(current_user.auth === ADMIN) {
    callback(undefined, true);
  }
  else {
    var funcs = [];
    if(current_user.auth === PROF) {
      var allowed = allowedProf.split(', ');
      funcs['edit_class'] = function(callback) {
        qStr = 'SELECT uid FROM Classes WHERE cid = ?';
        client.query(qStr, [perms['edit_class']], function(err, rows) {
          if(rows === undefined || rows[0] === undefined || rows[0].uid !== current_user.userid) {
            err = true;
          }
          callback(err);
        });
      };
    }
    else if(current_user.auth === STUDENT) {
      var allowed = allowedStudent.split(', ');
    }

    for(i in perms) {
      var found = false;
      if(allowed.indexOf(i) !== -1) {
        found = true;
      }
      else if(typeof(funcs[i]) === 'function') {
        found = true
        checks.push(funcs[i]);
      }
      if(!found) {
        err = true;
        break;
      }
    }

    if(err) {
      callback(err, false);
    }
    else if(checks.length > 0) {
      async.series(checks, function(err) {
        callback(err, typeof(err) === 'undefined');
      });
    }
    else {
      callback(undefined, true);
    }
  }
}

module.exports = checkPermissions;