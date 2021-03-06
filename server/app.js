/**
 * Module dependencies.
 */

var express = require('express');
var mysql = require('mysql');
var app = module.exports = express.createServer();
var config = require('./config');
var checkPermissions = require('./checkPermissions.js');
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

var loadSessionInfo = function(req,username, callback) {
  client.query('SELECT uid, auth_level FROM Users WHERE username = ?', [username], function(err, rows) {
    if(rows.length == 1) {
      req.session.user = new Object();
      req.session.user.username = username;
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
     req.route.params[0] == '/login-mobile' ||
     req.route.params[0] == '/logout-mobile' ||
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

/**
 * User manipulation routes
 */
var user = require('./users.js');

app.all('(/admin)|(/addUser)', function(req, res, next) {
  checkPermissions(req.session.user, {add_user: true}, res, next);
});
app.get('/remUser', function(req, res, next) {
  checkPermissions(req.session.user, {remove_user: true}, res, next);
});
app.post('/updateUser', function(req, res, next) {
  checkPermissions(req.session.user, {update_user_level: true}, res, next);
});
app.get('/users', function(req, res, next) {
  checkPermissions(req.session.user, {view_all_users: true}, res, next);
});

app.post('/addUser', user.validateAddUser);
app.get('/remUser', user.validateRemoveUser);
app.post('/updateUser', user.validateUpdateUser);

app.get('/admin', user.addUserForm);
app.post('/addUser', user.addUserSubmit);
app.get('/remUser', user.removeUserSubmit);
app.post('/updateUser', user.updateUserSubmit);
app.get('/users', user.viewUsers);

/**
 * Class manipulation routes
 */
var classes = require('./classes.js');

app.get('/addClass', function(req, res, next) {
  checkPermissions(current_user(req), {add_class: true}, res, next);
});
app.post('/addClass', function(req, res, next) {
  var tuser = parseInt(req.body.tuser);
  checkPermissions(current_user(req), {add_class_for_user: tuser}, res, next);
});
app.get('/(((edit)|(rem))Class)|(remStud)|(quizzes)', function(req, res, next) {
  var cid = parseInt(req.query.cid);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.post('/editClass', function(req, res, next) {
  checkPermissions(current_user(req), {edit_class: req.body.cid}, res, next);
});
app.get('/classes', function(req, res, next) {
  checkPermissions(req.session.user, {view_classes: true}, res, next);
});
app.post('/student', function(req, res, next) {
  var cid = parseInt(req.body.cid);
  checkPermissions(req.session.user, {edit_class: cid}, res, next);
});
app.get('/student', function(req, res, next) {
  checkPermissions(req.session.user, {view_edit_class: true}, res, next);
});

app.post('(/addClass)|(/editClass)', classes.validateAddClass);
app.get('/remStud', classes.validateRemoveStudent);
app.get('/remClass', classes.validateRemoveClass);
app.post('/student', classes.validateAddStudent);

app.get('/addClass', classes.addClassForm);
app.post('/addClass', classes.addClassSubmit);
app.get('/editClass', classes.editClassForm);
app.post('/editClass', classes.editClassSubmit);
app.get('/classes', classes.viewClasses);
app.get('/remStud', classes.removeStudentSubmit);
app.get('/remClass', classes.removeClassSubmit);
app.post('/student', classes.addStudentToClassSubmit);
app.get('/student', classes.addStudentToClassForm);
app.get('/quizzes', classes.viewClass);

/**
 * Quiz manipulation routes
 */
var quizzes = require('./quizzes.js');

app.get('/addQuiz', function(req, res, next) {
  checkPermissions(req.session.user, {add_quiz: true}, res, next);
});
app.get('/(((rem)|(view)|(enable)|(disable))Quiz)|(quizGrades)' +
    '|((add)|(edit)Question)' , function(req, res, next) {
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
app.post('/(editQuiz)|(addQuestion)', function(req, res, next) {
  var qid = parseInt(req.body.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, next);
});
app.post('/editQuestion', function(req, res, next) {
  var questid = req.body.questid;
  checkPermissions(req.session.user, {edit_question: questid}, res, next);
});
app.del('/question', function(req, res, next) {
  var questid = req.body.questid;
  checkPermissions(req.session.user, {edit_question: questid}, res, next);
});

app.get('/remQuiz', quizzes.validateRemoveQuiz);
app.post('(/addQuiz)|(/editQuiz)', quizzes.validateAddQuiz);
app.get('/enableQuiz', quizzes.validateEnableQuiz);
app.post('/(addQuestion)|(editQuestion)', quizzes.validateAddQuestion);

app.get('/addQuiz', quizzes.addQuizForm);
app.post('/addQuiz', quizzes.addQuizSubmit);
app.get('/remQuiz', quizzes.removeQuizSubmit);
app.get('/editQuiz', quizzes.editQuizForm);
app.post('/editQuiz', quizzes.editQuizSubmit);
app.get('/viewQuiz', quizzes.viewQuiz);
app.get('/enableQuiz', quizzes.enableQuizSubmit);
app.get('/disableQuiz', quizzes.disableQuizSubmit);
app.get('/quizGrades', quizzes.viewQuizGrades);
app.get('/addQuestion', quizzes.addQuestionForm);
app.post('/addQuestion', quizzes.addQuestionSubmit);
app.get('/editQuestion', quizzes.editQuestionForm);
app.post('/editQuestion', quizzes.editQuestionSubmit);
app.del('/question', quizzes.deleteQuestionSubmit);

/**
 * Module manipulation routes
 */
var modules = require('./modules.js');

app.all('/addModule', function(req, res, next) {
  checkPermissions(req.session.user, {add_quiz: true}, res, next);
});
app.get('/(rem)|(enable)|(disable)Module', function(req, res, next) {
  var mid = parseInt(req.query.mid);
  checkPermissions(req.session.user, {edit_module: mid}, res, next)
});

app.get('/addModule', modules.addModuleForm);
app.post('/addModule', modules.addModuleSubmit);
app.get('/remModule', modules.removeModuleSubmit);
app.get('/enableModule', modules.enableModuleSubmit);
app.get('/disableModule', modules.disableModuleSubmit);

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
  console.log('COOKIE:');
  console.log(req.cookies);
  loadSessionInfo(req,req.cookies['its-login-username'],function(err){
    if(!err){
    res.redirect("/");
    }
    else {
      res.render('login',{
        title:'Login',
        layout:false
      });
    }
  });
});

app.get('/login-mobile', function(req,res){
  var action = '';
  if(req.cookies['its-login-username']){
    console.log('cookie set');
    console.log(req.cookies['its-login-username']);
    action='display';
  }else{
    console.log('cookie not set');
    action='login';
  }
  res.render('login-mobile',{title:'Login',action:action,username:req.cookies['its-login-username'],layout:false});
});

app.get('/logout-mobile',function(req,res) {
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
  res.redirect('/login-mobile');
});


app.post('/test-login',function(req,res) {
  if(config.requireLogin) {
    res.redirect('/login');
  }

  else {
    loadSessionInfo(req,req.body.username, function(err) {
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
