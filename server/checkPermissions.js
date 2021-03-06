var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;
var async = require('async');
var config = require('./config');
var client = require('mysql').createClient(config.db);

var allowedProf = 'add_class, add_quiz, view_all_users, view_edit_class, view_classes';
var allowedStudent = '';

var checkPermissions = function(current_user, perms, res, callback) {
  var checks = [];
  var err;

  if(current_user.auth === ADMIN) {
    callback();
  }
  else {
    var funcs = [];
    if(current_user.auth === PROF) {
      var allowed = allowedProf.split(', ');
      funcs['add_class_for_user'] = function(callback) {
        if(perms['add_class_for_user'] !== current_user.userid) {
          err = true;
        }
        callback(err);
      };
      funcs['edit_class'] = function(callback) {
        qStr = 'SELECT uid FROM Classes WHERE cid = ?';
        client.query(qStr, [perms['edit_class']], function(err, rows) {
          if(rows === undefined || rows[0] === undefined || rows[0].uid !== current_user.userid) {
            err = true;
          }
          callback(err);
        });
      };
      funcs['edit_quiz'] = function(callback) {
        qStr = 'SELECT uid FROM Classes, Quizzes WHERE Classes.cid = Quizzes.cid and Quizzes.qid = ?';
        client.query(qStr, [perms['edit_quiz']], function(err, rows) {
          if(rows === undefined || rows[0] === undefined || rows[0].uid !== current_user.userid) {
            err = true;
          }
          callback(err);
        });
      };
      funcs['edit_module'] = function(callback) {
        qStr = 'SELECT uid FROM Classes, Modules WHERE Classes.cid = Modules.cid and Modules.mid = ?';
        client.query(qStr, [perms['edit_module']], function(err, rows) {
          if(rows === undefined || rows[0] === undefined || rows[0].uid !== current_user.userid) {
            err = true;
          }
          callback(err);
        });
      };
      funcs['edit_question'] = function(callback) {
        qStr = 'SELECT uid FROM Classes, Quizzes, Questions WHERE Classes.cid = Quizzes.cid'
          + ' AND Questions.qid = Quizzes.qid AND Questions.questid = ?';
        client.query(qStr, [perms['edit_question']], function(err, rows) {
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
      res.send(403);
    }
    else if(checks.length > 0) {
      async.series(checks, function(err) {
        if(err) {
          res.send(403);
        }
        else {
          callback();
        }
      });
    }
    else {
      callback();
    }
  }
}

module.exports = checkPermissions;
