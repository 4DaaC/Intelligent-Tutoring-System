var config = require('./config');
var client = require('mysql').createClient(config.db);

module.exports = function(app) {


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

}
