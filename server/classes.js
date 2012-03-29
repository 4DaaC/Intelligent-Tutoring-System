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

  var tuser = parseInt(req.body.tuser);
  qString = "INSERT INTO Classes (uid, name, classlimit, privacy) VALUES (?,?,?,?)";
  var values = [tuser, req.body.cname, req.body.limit, req.body.priv];
  client.query(qString, values, function(err) {
function addClassSubmit(req, res) {
    if(err) {
      console.log(err);
      req.flash("error",err);
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
  qString = "UPDATE Classes SET name = ?, classlimit = ?, privacy = ?, uid= ? WHERE cid = ?";
  var values = [req.body.cname, req.body.limit, req.body.priv, req.body.tuser, req.body.cid];
  client.query(qString, values, function(err) {
    if(err) {
      console.log(err);
      req.flash("error",err);
    }
    res.redirect('/classes');
  });
}

function removeStudentSubmit(req, res) {
  var cid = parseInt(req.query.cid);
  var uid = parseInt(req.query.uid);
  var qString = "DELETE FROM Class_List WHERE cid = ? AND uid = ?";
  client.query(qString, [cid, uid], function(err) {
    err && req.flash("error", err);
    res.redirect('back');
  });
}

function removeQuizSubmit(req, res) {
  var cid = parseInt(req.query.cid);
  client.query("DELETE FROM Quizzes WHERE qid = ?", [qid], function(err) {
    res.redirect('back');
  });
}

function removeClassSubmit(req, res) {
  var cid = parseInt(req.query.cid);
  var qString ="DELETE FROM Classes WHERE cid = ?";
  client.query(qString, [cid], function(err) {
    err && req.flash("error", err);
    res.redirect('back');
  });
}

function addStudentToClassSubmit(req, res) {
  var cid = parseInt(req.body.cid);
  var uid = parseInt(req.body.user);
  client.query("INSERT INTO Class_List (uid, cid) VALUES (?, ?)", [uid, cid], function(err) {
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
    qString = client.format(qString, [current_user(req).username]);
  }
  client.query(qString, function(err, results, fields) {
    console.log(results);
    res.render('student_class', {
      title: 'Add student to class',
      classes: results
    });
  });
}
