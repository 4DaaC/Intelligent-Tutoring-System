var config = require('./config');
var client = require('mysql').createClient(config.db);

var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;

exports.addClassForm = addClassForm;
exports.addClassSubmit = addClassSubmit;
exports.editClassForm = editClassForm;
exports.editClassSubmit = editClassSubmit;
exports.removeStudentSubmit = removeStudentSubmit;
exports.removeQuizSubmit = removeQuizSubmit;
exports.removeClassSubmit = removeClassSubmit;
exports.addStudentToClassSubmit = addStudentToClassSubmit;
exports.addStudentToClassForm = addStudentToClassForm;
exports.viewClasses = viewClasses;

//Routes
function addClassForm(req, res) {
  var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
  client.query(sqlStr, [req.query.cid], function(err2, classes) {
    if(err2) {
      req.flash("error", err2);
      res.redirect('/classes');
    }
    res.render('add_class', {
      title: 'Add Class',
      theClass: classes[0]
    });
  });
}

function addClassSubmit(req, res) {
  addClass(req.body.tuser, req.body.cname, req.body.limit, req.body.priv, function(err) {
    if(err) {
      console.log(err);
      req.flash("error", err);
    }
    res.redirect('/classes');
  });
}

function editClassForm(req, res) {
  var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
  client.query(sqlStr, [req.query.cid], function(err2, classes) {
    if(err2) {
      req.flash("error",err2);
      res.redirect('/classes');
    }
    res.render('edit_class', {
      title: 'Edit Class',
      theClass: classes[0]
    });
  });
}

function editClassSubmit(req, res) {
  var frm = req.body;
  editClass(frm.cname, frm.limit, frm.priv, frm.tuser, frm.cid, function(err) {
    if(err) {
      console.log(err);
      req.flash("error", err);
    }
    res.redirect('/classes');
  });
}

function removeStudentSubmit(req, res) {
  var cid = parseInt(req.query.cid);
  var uid = parseInt(req.query.uid);
  removeStudent(cid, uid, function(err) {
    err && req.flash("error", err);
    res.redirect('back');
  });
}

function removeQuizSubmit(req, res) {
  var qid = parseInt(req.query.qid);
  removeQuiz(qid, function(err) {
    res.redirect('back');
  });
}

function removeClassSubmit(req, res) {
  var cid = parseInt(req.query.cid);
  removeClass(cid, function(err) {
    err && req.flash("error", err);
    res.redirect('back');
  });
}

function addStudentToClassSubmit(req, res) {
  var cid = parseInt(req.body.cid);
  var uid = parseInt(req.body.user);
  addStudentToClass(uid, cid, function(err) {
    if(err) {
      req.flash("error", err);
      res.redirect('back');
    }
    else {
      res.redirect('/quizzes?cid=' + cid);
    }
  });
}

function addStudentToClassForm(req, res) {
  var qString = "SELECT cid, Classes.name FROM Classes, Users WHERE Classes.uid = Users.uid";
  if(req.session.user.auth != ADMIN) {
    qString += " AND Users.username = ?";
    qString = client.format(qString, [req.session.user.username]);
  }
  client.query(qString, function(err, results, fields) {
    console.log(results);
    res.render('student_class', {
      title: 'Add student to class',
      classes: results
    });
  });
}

function viewClasses(req, res) {
  qString = "select cid, username, name FROM Classes, Users WHERE Classes.uid = Users.uid";
  if(req.session.user.auth != ADMIN) {
    qString += " AND Users.username = ?";
    qString = client.format(qString, [req.session.user.username]);
  }
  console.log(qString);
  client.query(qString, function(err, results, fields) {
    res.render('classes', {
      title: 'Classes',
      classes: results
    });
  });
}

//Actions
function addClass(owner, name, classlimit, privacy, next) {
  qString = "INSERT INTO Classes (uid, name, classlimit, privacy) VALUES (?,?,?,?)";
  var values = [owner, name, classlimit, privacy];
  client.query(qString, values, next);
}

function editClass(classname, limit, privacy, owner, classid, next) {
  qString = "UPDATE Classes SET name = ?, classlimit = ?, privacy = ?, uid= ? WHERE cid = ?";
  var values = [classname, limit, privacy, owner, classid];
  client.query(qString, values, next);
}

function removeStudent(classid, studentid, next) {
  var qString = "DELETE FROM Class_List WHERE cid = ? AND uid = ?";
  client.query(qString, [classid, studentid], next);
}

function removeQuiz(quizid, next) {
  client.query("DELETE FROM Quizzes WHERE qid = ?", [quizid], next);
}

function removeClass(classid, next) {
  var qString ="DELETE FROM Classes WHERE cid = ?";
  client.query(qString, [classid], next);
}

function addStudentToClass(studentid, classid, next) {
  var qString = "INSERT INTO Class_List (uid, cid) VALUES (?, ?)";
  client.query(qString, [studentid, classid], next);
}
