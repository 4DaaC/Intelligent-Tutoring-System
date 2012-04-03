/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var app = module.exports = express.createServer();
var config = require('./config');
var checkPermissions = require('./checkPermissions.js');
var mkdirp = require('mkdirp');
var util = require('util');
var formidable = require('formidable');
var validate = require('./validateForm.js');
/*var app = module.exports = express.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});
*/
var client = mysql.createClient(config.db);
client.query('USE ' + config.db.database);

var ADMIN = 2;
var PROF = 1;
var STUDENT = 0;

var current_user = function(req){
  if(req.session.user){
    return req.session.user;
  }else return undefined;
}

var loadSessionInfo = function(req, callback) {
  client.query('SELECT uid, auth_level FROM Users WHERE username = ?', [req.body.username], function(err, rows) {
    if(rows.length == 1) {
      req.session.user = new Object();
      req.session.user.username = req.body.username;
      req.session.user.userid = parseInt(rows[0].uid);
      req.session.user.auth = parseInt(rows[0].auth_level);
    }
    else {
      err = new Error("No matching username");
    }
    callback(err);
  });
}

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: '~=ITS-4daac=~' }));
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.dynamicHelpers({
  session: function(req,res){ return req.session},
  userName: function(req, res) {return req.session.user == undefined ? undefined : req.session.user.username},
  userid: function(req, res) {return req.session.user == undefined ? undefined : req.session.user.userid},
  current_user: current_user,
  base_url: function(){return "http://itutor.radford.edu:" + config.port},
  isAdmin: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 2; },
  isProf: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 1; },
  isStudent: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 0; },
  requireLogin: function(){return config.requireLogin},
  errors: function(req,res){return req.flash("error")}
});

var isAdmin = function(req) {
	return req.session.user.auth === 2;
}

var isRequestMobile = function(req){
  var paramArray = req.route.params[0].split('/');
  if(paramArray.length >=2 && (paramArray[1] == 'mobile'|| paramArray[1] == 'uploads')){
    return true;
  }else return false;
}
var requireLogin = function(req,res,next){
  console.log(req.route.params);
  if(isRequestMobile(req) || 
     typeof(current_user(req)) !='undefined' || 
     req.route.params[0] == '/login' || 
     req.route.params[0] == '/test-login' ||
     req.route.params[0] == '/stylesheets/style.css'){
    next();
  }else{
    res.redirect("/login");
  }
}

var authCheck = function(req,callback){
  var qString = "SELECT auth_level FROM Users WHERE username = ?";
	var q = client.query(qString,[req.session.user.username],function(err,results,fields) {
    if(results.length == 1) {
      callback(results[0].auth_level);
    }else{
      callback(0);
    }
  });
}

// Routes

app.get('*',requireLogin);
app.put('*',requireLogin);
app.post('*',requireLogin);
require('./routes/index')(app,client);
require('./validateForm')(app);

var user = require('./users.js');
app.all('(/admin)|(/addUser)', function(req, res, next) {
  checkPermissions(req.session.user, {add_user: true}, res, next);
});

app.get('/admin', user.addUserForm);

app.post('/addUser', user.validateAddUser);
app.post('/addUser', user.addUserSubmit);

app.get('/remUser', function(req, res, next) {
  checkPermissions(req.session.user, {remove_user: true}, res, next);
});
app.get('/remUser', user.validateRemoveUser);
app.get('/remUser', user.removeUserSubmit);

app.post('/updateUser', function(req, res, next) {
  checkPermissions(req.session.user, {update_user_level: true}, res, next);
});
app.post('/updateUser', user.validateUpdateUser);
app.post('/updateUser', user.updateUserSubmit);

app.get('/users', function(req, res, next) {
  checkPermissions(req.session.user, {view_all_users: true}, res, next);
});
app.get('/users', user.viewUsers);

/**
 * Class manipulation routes
 */
var classes = require('./classes.js');
app.get('/addClass', function(req, res, next) {
  checkPermissions(current_user(req), {add_class: true}, res, next);
});
app.get('/addClass', classes.addClassForm);

app.post('/addClass', function(req, res, next) {
  var tuser = parseInt(req.body.tuser);
  checkPermissions(current_user(req), {add_class_for_user: tuser}, res, next);
});
app.post('/addClass', classes.addClassSubmit);

app.get('/editClass', function(req, res, next) {
  checkPermissions(current_user(req), {edit_class: req.query.cid}, res, next);
});
app.get('/editClass', classes.editClassForm);

app.post('/editClass', function(req, res, next) {
  checkPermissions(current_user(req), {edit_class: req.body.cid}, res, next);
});
app.post('/editClass', classes.editClassSubmit);

app.get('/classes', function(req, res, next) {
  checkPermissions(req.session.user, {view_classes: true}, res, next);
});
app.get('/classes', classes.viewClasses);

app.get('/remStud', function(req, res, next) {
  var cid = parseInt(req.query.cid);
  var uid = parseInt(req.query.uid);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.get('/remStud', classes.removeStudentSubmit);

app.get('/remClass', function(req, res, next) {
  var cid = parseInt(req.query.cid);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.get('/remClass', classes.removeClassSubmit);

app.post('/student', function(req, res, next) {
  var cid = parseInt(req.body.cid);
  var uid = parseInt(req.body.user);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.post('/student', classes.addStudentToClassSubmit);

app.get('/student', function(req, res, next) {
  checkPermissions(req.session.user, {view_edit_class: true}, res, next);
});
app.get('/student', classes.addStudentToClassForm);

app.get('/quizzes', function(req, res, next) {
  var cid = req.query.cid;
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.get('/quizzes', classes.viewClass);

/**
 * Quiz manipulation routes
 */
var quizzes = require('./quizzes.js');

app.get('/addQuiz', function(req, res, next) {
  checkPermissions(req.session.user, {add_quiz: true}, res, next);
});
app.get('/((rem)|(view)|(enable)|(disable)Quiz)|(quizGrades)', function(req, res, next) {
  var qid = parseInt(req.query.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, next);
});
app.post('/addQuiz', function(req, res, next) {
  var cid = parseInt(req.body.cid);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.get('/editQuiz', function(req, res, next) {
  checkPermissions(req.session.user, {view_edit_class: true}, res, next);
});
app.post('/editQuiz', function(req, res, next) {
  var qid = parseInt(req.body.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, next);
});

app.get('/addQuiz', quizzes.addQuizForm);
app.post('/addQuiz', quizzes.addQuizSubmit);
app.get('/remQuiz', quizzes.removeQuizSubmit);
app.get('/editQuiz', quizzes.editQuizForm);
app.post('/editQuiz', quizzes.editQuizSubmit);
app.get('/viewQuiz', quizzes.viewQuiz);
app.get('/enableQuiz', quizzes.enableQuizSubmit);
app.get('/disableQuiz', quizzes.disableQuizSubmit);
app.get('/quizGrades', quizzes.viewQuizGrades);

app.get('/addModule', function(req, res) {
  checkPermissions(req.session.user, {add_quiz: true}, res, function(err) {
    var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
    if(!isAdmin(req)) {
      qString += " AND Users.username = ?";
      qString = client.format(qString, [current_user(req).username]);
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
  });
});

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

app.post('/addModule', function(req,res){
  checkPermissions(req.session.user, {add_quiz: true}, res, function(err) {
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
      }else{
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
  });
});
app.get('/remModule',function(req,res){
  var mid = parseInt(req.query.mid);
  checkPermissions(req.session.user, {edit_module: mid}, res, function(err) {
    client.query("SELECT filepath FROM Modules WHERE mid = ?",[mid],function(err,results){
      if(err){
        console.log(err);
        req.flash('error',err);
        res.redirect('back');
      }
      else if(results.length < 1){
        console.log("Module Not Found");
        req.flash('error', "Module not found");
        res.redirect('back');
      }else{
        filepath = results[0].filepath;
        fs.unlink('public/' + filepath);
        client.query("DELETE FROM Modules WHERE mid = ?", [mid], function(err){
          res.redirect('back');
        });
      }
    });
  });
});

app.get('/enableModule', function(req,res) {
  var mid = parseInt(req.query.mid);
  checkPermissions(req.session.user, {edit_module: mid}, res, function(err) {
    client.query("UPDATE Modules SET active= '1' WHERE mid = ?", [mid],function(err){
      if(err){
        console.log(err)
        req.flash("error",err);
      }
      res.redirect('back');
    });
  });
});

app.get('/disableModule', function(req,res) {
  var mid = parseInt(req.query.mid);
  checkPermissions(req.session.user, {edit_module: mid}, res, function(err) {
    client.query("UPDATE Modules SET active= '0' WHERE mid = ?", [mid],function(err){
      if(err){
        console.log(err)
        req.flash("error",err);
      }
      res.redirect('back');
    });
  });
});

app.get('/addQuestion', function(req, res) {
  var questid = req.query.questid;
  var qid = req.query.qid;
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
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
  });
});

app.post('/addQuestion', function(req, res) {
  var qid = parseInt(req.body.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
    ans = stringify(req.body.ans);
    cor = stringify(req.body.correct);
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
  });
});

app.get('/editQuestion', function(req, res) {
  var questid = req.query.questid;
  var qid = req.query.qid;
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
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
  });
});

app.post('/editQuestion', function(req, res) {
  var qid = parseInt(req.body.qid);
  var questid = req.body.questid;
  checkPermissions(req.session.user, {edit_question: questid}, res, function(err) {
    ans = stringify(req.body.ans);
    cor = stringify(req.body.correct);
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
  });
});

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

app.del('/question', function(req, res) {
  var questid = req.body.questid;
  checkPermissions(req.session.user, {edit_question: questid}, res, function(err) {
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
  });
});

app.get('/', function(req, res){
  res.render('index', {
    title: 'Home'
  });
});

app.get('/studentList', function(req, res) {
  client.query("SELECT uid, username FROM Users", function(err, results) {
    res.send(results);
  });
});

app.get('/login',function(req,res) {
  console.log('req');
  if(typeof(current_user(req)) != 'undefined') {
    res.redirect("/");
  }
  else {
    res.render('login',{
      title:'Login',
      layout:false
    });
  }
});

app.post('/test-login',function(req,res) {
  if(config.requireLogin) {
    res.redirect('/login');
  }
  else {
    loadSessionInfo(req, function(err) {
      if(err) {
        res.redirect('/login');
      }
      else {
        res.cookie('its-login-username',req.body.username);
        res.redirect('/');
      }
    });
  }
});

app.get('/logout',function(req,res) {
  res.cookie('its-login-username', '', {
    expires: new Date(Date.now() - 1000),
  });
  res.cookie('its-login-username', '', {
    expires: new Date(Date.now() - 1000),
    path:'/',
    domain:'.radford.edu',
    httponly:'1'
  });
  req.session.destroy();
  res.redirect('/');
});
app.listen(config.port);
console.log(app.address());
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
