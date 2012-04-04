var config = require('./config');
var client = require('mysql').createClient(config.db);

module.exports = function(app) {

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
