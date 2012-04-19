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
exports.removeClassSubmit = removeClassSubmit;
exports.addStudentToClassSubmit = addStudentToClassSubmit;
exports.addStudentToClassForm = addStudentToClassForm;
exports.viewClasses = viewClasses;
exports.viewClass = viewClass;
exports.validateAddClass = validateAddClass;
exports.validateRemoveStudent = validateRemoveStudent;
exports.validateRemoveClass = validateRemoveClass;
exports.validateAddStudent = validateAddStudent;

exports.disconnect = function() {
	client.destroy();
}

//Routes
function addClassForm(req, res) {
  var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
  client.query(sqlStr, [req.query.cid], function(err2, classes) {
    if(err2) {
      req.flash("error", err2);
      res.redirect('/classes');
    }
    client.query("SELECT * FROM Users WHERE auth_level > 0",function(err3,profs){
      res.render('edit_class', {
        title: 'Add Class',
        layout:false,
        theClass: classes[0],
        professors: profs
      });
    });
  });
}

function addClassSubmit(req, res) {
  addClass(req.body.tuser, req.body.cname, req.body.limit, req.body.priv, function(err) {
    if(err) {
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
    client.query("SELECT * FROM Users WHERE auth_level > 0",function(err3,profs){
      res.render('edit_class', {
        title: 'Edit Class',
        layout: false,
        theClass: classes[0],
        professors:profs
      });
    });
  });
}

function editClassSubmit(req, res) {
  var frm = req.body;
  editClass(frm.cname, frm.limit, frm.priv, frm.tuser, frm.cid, function(err) {
    if(err) {
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
    client.query("SELECT * FROM Users", function(err2, students){
      res.render('student_class', {
        title: 'Add student to class',
        layout:false,
        classes: results,
        students:students
      });
    });
  });
}

function viewClasses(req, res) {
  qString = "select Classes.*, username, name FROM Classes, Users WHERE Classes.uid = Users.uid";
  if(req.session.user.auth != ADMIN) {
    qString += " AND Users.username = ?";
    qString = client.format(qString, [req.session.user.username]);
  }
  client.query(qString, function(err, results, fields) {
    res.render('classes', {
      title: 'Classes',
      classes: results
    });
  });
}

function viewClass(req, res) {
  var cid = req.query.cid;
  var qString = "select Quizzes.*, Classes.name AS className FROM Quizzes, Classes WHERE Classes.cid = Quizzes.cid " +
    "AND Quizzes.cid = ?";
  client.query(qString, [cid], function(err, results, fields) {
    qString = "select mid, Modules.active,Modules.title, Modules.filepath, Classes.name AS className FROM Modules, Classes WHERE Classes.cid = Modules.cid " +
    "AND Modules.cid = ?";
    client.query(qString,[cid],function(err3,modules){
      qString = "select Users.username, Users.uid FROM Class_List, Users WHERE Class_List.uid = Users.uid AND " +
      " Class_List.cid = ?";
      client.query(qString, [cid], function(err2, results2, fields2) {
        res.render('quizzes', {
          title:"Quizzes",
          quizzes: results,
          modules: modules,
          students: results2,
          cid: cid
        });
      });
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

function removeClass(classid, next) {
  var qString ="DELETE FROM Classes WHERE cid = ?";
  client.query(qString, [classid], next);
}

function addStudentToClass(studentid, classid, next) {
  var qString = "INSERT INTO Class_List (uid, cid) VALUES (?, ?)";
  client.query(qString, [studentid, classid], next);
}

// Validation
function validateAddClass(req, res, next) {
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
    next();
  }
}

function validateRemoveStudent(req, res, next) {
  var qString = "SELECT cid FROM Class_List WHERE cid = ? AND uid = ?";
  client.query(qString, [req.query.cid, req.query.uid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "User is not in specified class");
      res.redirect('back');
    }
    else {
      next();
    }
  });
}

function validateRemoveClass(req, res, next){
  var qString = "SELECT cid FROM Classes WHERE cid = ?";
  client.query(qString, [req.query.cid], function(err, rows) {
    if(rows.length === 0) {
      req.flash("error", "Class does not exist");
      res.redirect('back');
    }
    else {
      next();
    }
  });
}

function validateAddStudent(req, res, next) {
  var qString = "SELECT uid FROM Users WHERE uid = ?";
  client.query(qString, [req.body.user], function(err, rows) {
    var qString = "SELECT cid FROM Classes WHERE cid = ?";
    client.query(qString, [req.body.cid], function(err, rows2) {
      var foundErr = false;
      if(rows.length === 0) {
        req.flash("error", "User does not exist");
        foundErr = true;
      }
      if(rows2.length === 0) {
        req.flash("error", "Class does not exist");
        foundErr = true;
      }
      if(foundErr) {
        res.redirect('back');
      }
      else {
        next();
      }
    });
  });
}
