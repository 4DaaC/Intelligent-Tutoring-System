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
        classes: results,
        select: req.query.cid
      });
    }
  });
}

function addModuleSubmit(req, res) {
  console.log('START');
  var name = req.body.mname;
  var cid = req.body.cid;
  //if(isAdmin(req)) {
    console.log("IS_ADMIN");
    var form = new formidable.IncomingForm();
    console.log("PREDERP");
    console.log("DERP");
    if(req.files['pdf-file'].type != 'application/pdf' || req.files['pdf-file'].size > 10485760){
      console.log('not valid');
      req.flash('error','File must be a .pdf file and less than 10 Mb');
      res.redirect('back');
    }
    else {
    var dirp = dirpString();
    mkdirp('public/'+dirp, 0777, function(derrp) {
      console.log(derrp)
      var files = req.files;
      console.log("DERPED");
      console.log(files['pdf-file']);
      var is = fs.createReadStream(files['pdf-file'].path);
      var os = fs.createWriteStream("public/"+dirp+files['pdf-file'].name);
      util.pump(is, os, function() {
        console.log("PUMPED");
        fs.unlinkSync(files['pdf-file'].path);
        var qString = "INSERT INTO Modules (cid, title, filepath) VALUES (?, ? , ?)";
        client.query(qString, [cid, name, dirp+files['pdf-file'].name], function(err) {
          console.log("INSERTED");
          if(err) {
            console.log(err);
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
      console.log(err);
      req.flash('error', err);
      res.redirect('back');
    }
    else if(results.length < 1) {
      console.log("Module Not Found");
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
      console.log(err)
      req.flash("error", err);
    }
    res.redirect('back');
  });
}

function disableModuleSubmit(req, res) {
  var mid = parseInt(req.query.mid);
  client.query("UPDATE Modules SET active= '0' WHERE mid = ?", [mid], function(err){
    if(err){
      console.log(err)
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
