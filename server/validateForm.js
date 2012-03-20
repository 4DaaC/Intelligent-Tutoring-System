var config = require('./config');
var client = require('mysql').createClient(config.db);

module.exports = function(app) {

app.post('(/addClass)|(/editClass)', function(req, res, next) {
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
});

app.post('/addUser', function(req, res, next) {
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
});

app.get('/remUser',function(req, res, next){
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
});

app.get('/remStud',function(req, res, next){
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
});

app.get('/remQuiz',function(req, res, next){
  var qString = "SELECT qid FROM Quizzes WHERE qid = ?";
  client.query(qString, [req.query.qid], function(err, rows){
    if(rows.length === 0) {
      req.flash("error", "Quiz does not exist");
      res.redirect('back');
    }
    else {
      next();
    }
  });
});

app.get('/remClass',function(req, res, next){
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
});

app.post('/student', function(req, res, next) {
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
});

app.post('(/addQuiz)|(/editQuiz)', function(req, res, next) {
  var qname = req.body.qname;
  var question_amount = parseInt(req.body.question_amount);
  var foundErr = false;
  if(qname.length <=0 || qname.length > 50) {
    req.flash('error','Quiz Name must be between 1 and 50 characters long');
    foundErr = true;
  }
  if(isNaN(question_amount)) {
    req.flash('error', 'Question Amount must be a number');
    foundErr = true;
  }
  if(question_amount <= 0) {
    req.flash('error', 'Question Amount must be a positive number');
    foundErr = true;
  }
  if(foundErr) {
    res.redirect('back');
  }
  else {
    next();
  }
});

app.post('(/addQuestion)|(/editQuestion)', function(req, res, next) {
  var action = req.body.action;
  var quest = req.body.question;
  var ans = req.body.ans;
  var cor = req.body.correct;
  var type = req.body.type;
  var cat = req.body.cat;
  var diff = req.body.diff;
  var questid = req.body.questid;
  var foundErr = false;

  if(typeof(cor) === 'undefined' || cor === '') {
    req.flash('error', 'You must choose at least 1 correct answer');
    foundErr = true;
  }
  if(quest.length <=0 || quest.length > 500) {
    req.flash('error','Quiz Name must be between 1 and 500 characters long');
    foundErr = true;
  }
  if(foundErr) {
    res.redirect('back');
  }
  else {
    next();
  }
});

app.post('/updateUser', function(req, res, next) {
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
});

}
