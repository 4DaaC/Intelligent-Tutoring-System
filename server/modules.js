var config = require('./config');
var client = require('mysql').createClient(config.db);
var formidable = require('formidable');
var util = require('util');
var fs = require('fs');
var mkdirp = require('mkdirp');

var STUDENT = 0;
var PROF = 1;
var ADMIN = 2;

exports.addModuleForm = addModuleForm;
exports.addModuleSubmit = addModuleSubmit;
exports.removeModuleSubmit = removeModuleSubmit;
exports.enableModuleSubmit = enableModuleSubmit;
exports.disableModuleSubmit = disableModuleSubmit;

// Routes
function addModuleForm(req, res) {
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
      res.render('add_module', {
        title:'Add Module',
        layout:false,
        classes: results,
        select: req.query.cid
      });
    }
  });
}

function addModuleSubmit(req, res) {
  var name = req.body.mname;
  var cid = req.body.cid;
  //if(isAdmin(req)) {
    var form = new formidable.IncomingForm();
    if(req.files['pdf-file'].type != 'application/pdf' || req.files['pdf-file'].size > 10485760){
      req.flash('error','File must be a .pdf file and less than 10 Mb');
      res.redirect('back');
    }
    else {
    var dirp = dirpString();
    mkdirp('public/'+dirp, 0777, function(derrp) {
      var files = req.files;
      var is = fs.createReadStream(files['pdf-file'].path);
      var os = fs.createWriteStream("public/"+dirp+files['pdf-file'].name);
      util.pump(is, os, function() {
        fs.unlinkSync(files['pdf-file'].path);
        var qString = "INSERT INTO Modules (cid, title, filepath) VALUES (?, ? , ?)";
        client.query(qString, [cid, name, dirp+files['pdf-file'].name], function(err) {
          if(err) {
            req.flash('error', err);
            res.redirect('back');
          } else {
            res.redirect('/quizzes?cid='+cid);
          }
        });
      });
    });
    }
  //} else {
    //TODO check permissions for non-admin
  //}
}

function removeModuleSubmit(req, res) {
  var mid = parseInt(req.query.mid);
  client.query("SELECT filepath FROM Modules WHERE mid = ?", [mid], function(err, results) {
    if(err) {
      req.flash('error', err);
      res.redirect('back');
    }
    else if(results.length < 1) {
      req.flash('error', "Module not found");
      res.redirect('back');
    }
    else {
      filepath = results[0].filepath;
      fs.unlink('public/' + filepath);
      client.query("DELETE FROM Modules WHERE mid = ?", [mid], function(err) {
        res.redirect('back');
      });
    }
  });
}

function enableModuleSubmit(req, res) {
  var mid = parseInt(req.query.mid);
  client.query("UPDATE Modules SET active= '1' WHERE mid = ?", [mid], function(err) {
    if(err) {
      req.flash("error", err);
    }
    res.redirect('back');
  });
}

function disableModuleSubmit(req, res) {
  var mid = parseInt(req.query.mid);
  client.query("UPDATE Modules SET active= '0' WHERE mid = ?", [mid], function(err){
    if(err){
      req.flash("error", err);
    }
    res.redirect('back');
  });
}

// Actions
function dirpString() {
  var time = new Date().getTime().toString();
  var dir = "uploads/";
  for(num = 0; num < time.length; num = num + 2){
    dir += time.substring(num, num + 2) + '/';
  }
  if (dir.substring(dir.length-1) == '/')
    return dir;
  else return dir + '/';
}
