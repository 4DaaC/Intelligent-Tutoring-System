var config = require('./config');
var client = require('mysql').createClient(config.db);

var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;

exports.addQuizForm = addQuizForm;
exports.addQuizSubmit = addQuizSubmit;
exports.removeQuizSubmit = removeQuizSubmit;
exports.editQuizForm = editQuizForm;
exports.editQuizSubmit = editQuizSubmit;
exports.viewQuiz = viewQuiz;
exports.enableQuizSubmit = enableQuizSubmit;
exports.disableQuizSubmit = disableQuizSubmit;
exports.viewQuizGrades = viewQuizGrades;
exports.addQuestionForm = addQuestionForm;
exports.addQuestionSubmit = addQuestionSubmit;
exports.editQuestionForm = editQuestionForm;
exports.editQuestionSubmit = editQuestionSubmit;
exports.deleteQuestionSubmit = deleteQuestionSubmit;
exports.validateRemoveQuiz = validateRemoveQuiz;
exports.validateAddQuiz = validateAddQuiz;
exports.validateEnableQuiz = validateEnableQuiz;
exports.validateAddQuestion = validateAddQuestion;

function addQuizForm(req, res) {
  var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
  if(req.session.user.auth != ADMIN) {
    qString += " AND Users.username = ?";
    qString = client.format(qString, [req.session.user.username]);
  }
  client.query(qString, function(err, results, fields) {
    if (results.length == 0) {
      req.flash('error', "You must create a class first");
      res.redirect('back');
    }
    else {
      res.render('edit_quiz', {
        title:'Add Quiz',
        classes: results,
        select: req.query.cid
      });
    }
  });
}

function addQuizSubmit(req, res) {
  var cid = parseInt(req.body.cid);
  var qname = req.body.qname;
  var question_amount = req.body.question_amount;
  addQuiz(qname, cid, question_amount, function(err) {
    err && req.flash("error", err);
    res.redirect('/quizzes?cid=' + cid);
  });
}

function removeQuizSubmit(req, res) {
  var qid = parseInt(req.query.qid);
  removeQuiz(qid, function(err) {
    res.redirect('back');
  });
}

function editQuizForm(req, res) {
  var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
  if(req.session.user.auth != ADMIN) {
    qString += " AND Users.username = ?";
    qString = client.format(qString, [req.session.user.username]);
  }
  client.query(qString, function(err, results, fields) {
    if(err) {
      req.flash("error",err);
      res.redirect('/classes');
    }
    else if (results.length == 0) {
      req.flash('error', "class doesn't exist or does not belong to you");
      res.redirect('back');
    }
    else {
      var sql = "SELECT * FROM Quizzes WHERE qid= ?" ;
      client.query(sql, [req.query.qid],function(err2,quizzes) {
        if(err2) {
          req.flash("error",err2);
          res.redirect('back');
        }
        else {
          res.render('edit_quiz', {
            title:'Edit Quiz',
            classes: results,
            select: req.query.cid,
            quiz: quizzes[0]
          });
        }
      });
    }
  });
}

function editQuizSubmit(req, res) {
  var qid = parseInt(req.body.qid);
  var qname = req.body.qname;
  var cid = parseInt(req.body.cid);
  var question_amount = req.body.question_amount;
  var sqlStr = "UPDATE Quizzes SET name= ?, cid = ?, question_amount = ? WHERE qid = ?";
  editQuiz(qname, cid, question_amount, req.body.qid, function(err) {
    err && req.flash("error", err);
    res.redirect('/quizzes?cid=' + cid);
  });
}

function viewQuiz(req, res) {
  var qid = parseInt(req.query.qid);
  var qString = "SELECT * FROM Quizzes WHERE qid = ?";
  console.log(qString);
  client.query(qString, [qid], function(err, quiz, fields) {
    client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err, results, fields) {
      console.log(results);
      difficulty = [0,0,0,0];
      for(idx in results){
        difficulty[results[idx].difficulty] ++;
      }
      res.render('edit_questions', {
        title: quiz[0].name,
        questions: results,
        quiz: quiz[0],
        diffArray: difficulty,
        qid: qid
      });
    });
  });
}

function enableQuizSubmit(req, res) {
  var qid = parseInt(req.query.qid);
  enableQuiz(qid, function(err) {
    if(err) {
      console.log(err)
      req.flash("error", err);
    }
    res.redirect('/viewQuiz?qid=' + qid);
  });
}

function disableQuizSubmit(req, res) {
  var qid = parseInt(req.query.qid);
  disableQuiz(qid, function(err) {
    if(err) {
      console.log(err);
      req.flash("error", err);
    }
    res.redirect('/viewQuiz?qid=' + qid);
  });
}

function viewQuizGrades(req, res) {
  var qid = parseInt(req.query.qid);
  client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err, results) {
    var questions = new Object();
    for(var idx in results) {
      questions[results[idx].questid] = results[idx];
    }
    var sql = "SELECT Users.username, Answers.questid, Answers.saved_answer, Answers.time_spent"
              + " FROM Users, Answers"
              + " WHERE Users.uid = Answers.uid AND Answers.questid"
              + " IN (SELECT questid FROM Questions WHERE qid = ?)";
    client.query(sql, [qid], function(err2, answers) {
      res.render('grades', {
        title:"Grade View",
        questions: questions,
        answers: answers
      });
    });
  });
}

function addQuestionForm(req, res) {
  var qid = req.query.qid;
  res.render(req.query.type, {
    title: '',
    qid: qid,
    action: 'addQuestion',
    answers: '{}',
    questid: '-1',
    quest: '{}',
    add: true,
    name: ''
  });
}

function addQuestionSubmit(req, res) {
  var qid = parseInt(req.body.qid);
  var ans = stringify(req.body.ans);
  var cor = stringify(req.body.correct);
  var qString = "INSERT INTO Questions (qid, type, question, answers, correct_answer, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)";
  qString = client.format(qString, [qid, req.body.type, req.body.question, ans, cor, req.body.cat, req.body.diff]);
  client.query(qString, function(err) {
    if(err) {
      console.log(err);
      res.send(503);
    }
    else {
      res.redirect('/viewQuiz?qid=' + qid);
    }
  });
}

function editQuestionForm(req, res) {
  var questid = req.query.questid;
  var qid = req.query.qid;
  var qString = 'SELECT * FROM Questions WHERE qid = ? AND questid = ?';
  qString = client.format(qString, [qid, questid]);
  console.log(qString);
  client.query(qString, function(err, results, fields) {
    var pass = {
      title : '',
      qid: qid,
      action: 'editQuestion',
      answers: results[0].answers,
      questid: questid,
      quest: results[0],
      name : results[0].question,
      add: false
    };
    if(results[0].type == 'short') {
      res.render('short', pass);
    }
    else if(results[0].type == 'multi') {
      res.render('multi', pass)
    }
    else if(results[0].type == 'tf') {
      res.render('tf', pass);
    }
    else {
      console.log('Could not find questid = '+questid+' and qid = '+qid);
      res.send(503);
    }
  });
}

function editQuestionSubmit(req, res) {
  var qid = parseInt(req.body.qid);
  var questid = req.body.questid;
  var ans = stringify(req.body.ans);
  var cor = stringify(req.body.correct);
  var qString = "UPDATE Questions SET question = ?, type = ?, answers = ?, correct_answer = ?, category = ?, difficulty = ? WHERE questid = ?";
  qString = client.format(qString, [req.body.question, req.body.type, ans, cor, req.body.cat, req.body.diff, questid]);
  client.query(qString, function(err) {
    if(err) {
      console.log(err);
      res.send(503);
    }
    else {
      res.redirect('/viewQuiz?qid=' + qid);
    }
  });
}

function deleteQuestionSubmit(req, res) {
  var questid = req.body.questid;
  console.log(questid);
  var qString = 'DELETE FROM Questions WHERE questid = ?';
  qString = client.format(qString, [questid]);
  client.query(qString, function(err) {
    if(err) {
      console.log(err);
      res.send(503);
    }
    else {
      res.send(200);
    }
  });
}

// Actions
function removeQuiz(quizid, next) {
  client.query("DELETE FROM Quizzes WHERE qid = ?", [quizid], next);
}

function addQuiz(quizname, classid, questionAmount, next) {
  var sqlStr = "INSERT INTO Quizzes (name, cid, question_amount) VALUES (?, ?, ?)";
  client.query(sqlStr, [quizname, classid, questionAmount], next);
}

function editQuiz(quizName, classid, questionAmount, quizid, next) {
  var sqlStr = "UPDATE Quizzes SET name = ?, cid = ?, question_amount = ? WHERE qid = ?";
  client.query(sqlStr, [quizName, classid, questionAmount, quizid], next);
}

function enableQuiz(quizid, next) {
  client.query("UPDATE Quizzes SET active= '1' WHERE qid = ?", [quizid], next);
}

function disableQuiz(quizid, next) {
  client.query("UPDATE Quizzes SET active = '0' WHERE qid = ?", [quizid], next);
}

function stringify(str) {
  str = JSON.stringify(str);
  if(str != undefined && str[0] == '"') {
    str = '['+str+']';
  }
  else if(str == undefined) {
    str = '[]';
  }
  return str;
}

// Validation
function validateRemoveQuiz(req, res, next) {
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
}

function validateAddQuiz(req, res, next) {
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
}

function validateEnableQuiz(req, res, next) {
  var quizid = parseInt(req.query.qid);
  var qString = "SELECT * FROM Quizzes WHERE qid = ?";
  client.query(qString, [quizid], function(err, quiz, fields) {
    client.query("SELECT * FROM Questions WHERE qid = ?", [quizid], function(err, results, fields) {
      difficulty = [0,0,0,0];
      question_amount = quiz[0]['question_amount'];
      for(idx in results) {
        difficulty[results[idx].difficulty] ++;
      }
      if(difficulty[1] >= question_amount && difficulty[2] >= question_amount && difficulty[3] >= question_amount) {
        next();
      }else{
        req.flash("error", "This quiz does not have enough questions to be enabled");
        res.redirect('/viewQuiz?qid=' + quizid);
      }
    });
  });
}

function validateAddQuestion(req, res, next) {
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
}
