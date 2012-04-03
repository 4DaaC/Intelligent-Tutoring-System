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
      res.render('add_quiz', {
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
  var sqlStr = "INSERT INTO Quizzes (name, cid, question_amount) VALUES (?, ?, ?)";
  client.query(sqlStr, [qname, cid, question_amount], function(err) {
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
  client.query(sqlStr, [qname, cid, question_amount, req.body.qid], function(err) {
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
  var qString = "SELECT * FROM Quizzes WHERE qid = ?";
  console.log(qString);
  client.query(qString, [qid], function(err, quiz, fields) {
    client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err, results, fields) {
      console.log(results);
      difficulty = [0,0,0,0];
      question_amount = quiz[0]['question_amount'];
      for(idx in results) {
        difficulty[results[idx].difficulty] ++;
      }
      if(difficulty[1] >= question_amount && difficulty[2] >= question_amount && difficulty[3] >= question_amount) {
        client.query("UPDATE Quizzes SET active= '1' WHERE qid = ?", [qid], function(err) {
          if(err) {
            console.log(err)
            req.flash("error", err);
          }
          res.redirect('/viewQuiz?qid=' + qid);
        });
      }else{
        req.flash("error", "This quiz does not have enough questions to be enabled");
        res.redirect('/viewQuiz?qid=' + qid);
      }
    });
  });
}

function disableQuizSubmit(req, res) {
  var qid = parseInt(req.query.qid);
  client.query("UPDATE Quizzes SET active = '0' WHERE qid = ?", [qid], function(err) {
    if(err) {
      console.log(err);
      req.flash("error",err);
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

// Functions
function removeQuiz(quizid, next) {
  client.query("DELETE FROM Quizzes WHERE qid = ?", [quizid], next);
}
