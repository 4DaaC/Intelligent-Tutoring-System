var config = require('./config');
var client = require('mysql').createClient(config.db);

exports.addClassForm = addClassForm;
exports.addUserForm = addUserForm;
exports.deleteUserForm = deleteUserForm;
exports.removeStudentForm = removeStudentForm;
exports.removeQuizForm = removeQuizForm;
exports.removeClassForm = removeClassForm;

function addClassForm(req, res, callback) {
  var name = req.body.cname;
  var limit = req.body.limit;
  var priv = req.body.priv;
  var foundErr = false;
  if(name.length <= 1 || name.length >= 30) {
    req.flash("error","Class Name must be between 1 and 30 characters long");
    foundErr = true;
  }
  if(isNaN(parseInt(limit, 10)) || parseInt(limit, 10) <= 0) {
    req.flash("error","Class Limit must be a positive number");
    foundErr = true;
  }
  if(priv < 0 || priv > 1) {
    req.flash("error","Privacy setting is invalid");
    foundErr = true;
  }
  if(foundErr) {
    res.redirect('back');
  }
  else {
    callback();
  }
}

function addUserForm(req, res, callback) {
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
    callback();
  }
}

function deleteUserForm(req, res, callback) {
  var uid = req.query.uid;
  qStr = 'SELECT uid FROM Users WHERE uid = ?';
  client.query(qStr, [uid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "User does not exist");
      res.redirect('back');
    }
    else {
      callback();
    }
  });
}

function removeStudentForm(req, res, callback) {
  var qString = "SELECT cid FROM Class_List WHERE cid = ? AND uid = ?";
  client.query(qString, [req.query.cid, req.query.uid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "User is not in specified class");
      res.redirect('back');
    }
    else {
      callback();
    }
  });
}

function removeQuizForm(req, res, callback) {
  var qString = "SELECT qid FROM Quizzes WHERE qid = ?";
  console.log(qString);
  client.query(qString, [req.query.qid], function(err, rows){
    if(rows.length === 0) {
      req.flash("error", "Quiz does not exist");
      res.redirect('back');
    }
    else {
      callback();
    }
  });
}

function removeClassForm(req, res, callback) {
  var qString = "SELECT cid FROM Classes WHERE cid = ?";
  console.log(qString);
  client.query(qString, [req.query.cid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "Class does not exist");
      res.redirect('back');
    }
    else {
      callback();
    }
  });
}
