var config = require('./config');
var client = require('mysql').createClient(config.db);

exports.addClassForm = addClassForm;

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
