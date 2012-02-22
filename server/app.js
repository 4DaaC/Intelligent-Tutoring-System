/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var app = module.exports = express.createServer();
var config = require('./config');
var checkPermissions = require('./checkPermissions.js');
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
  if(paramArray.length >=2 && paramArray[1] == 'mobile'){
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


app.get('/admin', function(req, res) {
  if(isAdmin(req)) {
    res.render('control_panel', {
      title: 'Admin Panel'
    });
  } else {
    res.send(403);
  }
});

app.get('/addClass', function(req, res) {
  checkPermissions(current_user(req), {add_class: true}, res, function(err) {
    var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
    client.query(sqlStr, [req.query.cid], function(err2, classes){
      if(err2){
        req.flash("error",err2);
        res.redirect('/classes');
      }
      res.render('add_class', {
        title: 'Add Class',
        theClass: classes[0]
      });
    });
  });
});

app.post('/addClass', function(req, res) {
  var tuser = parseInt(req.body.tuser);
  checkPermissions(current_user(req), {add_class_for_user: tuser}, res, function(err) {
    validate.addClassForm(req, res, function(err) {
      qString = "INSERT INTO Classes (uid, name, classlimit, privacy) VALUES (?,?,?,?)";
      var values = [tuser, req.body.cname, req.body.limit, req.body.priv];
      client.query(qString, values, function(err) {
        if(err) {
          console.log(err);
          req.flash("error",err);
        }
        res.redirect('/classes');
      });
    });
  });
});

app.get('/editClass', function(req, res) {
  checkPermissions(current_user(req), {edit_class: req.query.cid}, res, function(err) {
    var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
    client.query(sqlStr, [req.query.cid], function(err2, classes){
      if(err2){
        req.flash("error",err2);
        res.redirect('/classes');
      }
      res.render('edit_class', {
        title: 'Edit Class',
        theClass: classes[0]
      });
    });
  });
});

app.post('/editClass', function(req, res) {
  checkPermissions(current_user(req), {edit_class: req.body.cid}, res, function(err) {
    validate.addClassForm(req, res, function(err) {
      qString = "UPDATE Classes SET name = ?, classlimit = ?, privacy = ?, uid= ? WHERE cid = ?";
      var values = [req.body.cname, req.body.limit, req.body.priv, req.body.tuser, req.body.cid];
      client.query(qString, values, function(err) {
        if(err){
          console.log(err);
          req.flash("error",err);
        }
        res.redirect('/classes');
      });
    });
  });
});

app.post('/addUser', function(req, res) {
  checkPermissions(current_user(req), {add_user: true}, res, function(err) {
    validate.addUserForm(req, res, function() {
      var qString = "INSERT INTO Users (username, auth_level) VALUES (?, ?)";
      client.query(qString, [req.body.user, req.body.auth], function(err) {
        if(err) {
          req.flash("error", err);
          res.redirect('back');
        }
        else {
          res.redirect('/users');
        }
      });
    });
  });
});

app.get('/remUser',function(req,res){
  checkPermissions(current_user(req), {remove_user: true}, res, function(err) {
    validate.deleteUserForm(req, res, function() {
      var qString = "DELETE FROM Users WHERE uid = ?";
      console.log(qString);
      client.query(qString, [req.query.uid], function(err) {
        if(err) console.log(err);
      });
      res.redirect('/users');
    });
  });
});

app.get('/remStud',function(req, res){
  var cid = parseInt(req.query.cid);
  var uid = parseInt(req.query.uid);
  checkPermissions(req.session.user, {edit_class: cid}, res, function(err) {
    if(cid !== undefined && uid !== undefined) {
      var qString = "DELETE FROM Class_List WHERE cid = ? AND uid = ?";
      client.query(qString, [cid, uid], function(err) {
        if(err) {
          console.log(err);
          req.flash("error", err);
        }
        res.redirect('/quizzes?cid=' + cid);
      });
    } else res.send(403);
  });
});

app.get('/remQuiz',function(req,res){
  var qid = parseInt(req.query.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
    if(qid !== undefined){
      var qString = "SELECT cid, qid FROM Quizzes WHERE qid = ?";
      console.log(qString);
      client.query(qString, [qid], function(err, results, fields){
        if(err){
          console.log(err);
          req.flash("error",err);
          res.redirect('/');
        }
        else if(results.length === 1){
          console.log(results);
          client.query("DELETE FROM Quizzes WHERE qid = ?", [qid], function(err){
            console.log(err);
            res.redirect('/quizzes?cid=' + results[0].cid);
          });
        }else res.redirect('/');
      });
    } else res.redirect('/');
  });
});

app.get('/remClass',function(req,res){
  var cid = parseInt(req.query.cid);
  checkPermissions(req.session.user, {edit_class: cid}, res, function(err) {
    if(cid !== undefined) {
      var qString = "SELECT cid FROM Classes WHERE cid = ?";
      console.log(qString);
      client.query(qString, [cid], function(err,results,fields) {
        if(results.length === 1){
          var qString ="DELETE FROM Classes WHERE cid = ?";
          console.log(qString);
          client.query(qString,[cid],function(err){
            if(err){
              console.log(err);
            }
            res.redirect('/classes');
          });
        }
        else {
          res.redirect('/classes');
        }
      });
    }
    else {
      res.redirect('/classes');
    }
  });
});

app.post('/student', function(req, res) {
  var cid = parseInt(req.body.cid);
  var user = parseInt(req.body.user);
  checkPermissions(req.session.user, {edit_class: cid}, res, function(err) {
    client.query("SELECT uid FROM Users WHERE username = ?", [user], function(err, results) {
      if(err) {
        console.log(err);
      } else {
        var uid = results[0].uid;
        client.query("INSERT INTO Class_List (uid, cid) VALUES (?,?)", [uid, cid] ,function(err) {
          if(err) {
            console.log(err);
          }
        });
      }
      res.redirect('/student');
    });
  });
});

app.get('/student', function(req, res) {
  checkPermissions(req.session.user, {view_edit_class: true}, res, function(err) {
    var qString = "SELECT cid, Classes.name FROM Classes, Users WHERE Classes.uid = Users.uid";
    if(!isAdmin(req)) {
      qString += " AND Users.username = ?";
      qString = client.format(qString, [current_user(req).username]);
    }
    client.query(qString, function(err, results, fields) {
      console.log(results);
      res.render('student_class', {
        title: 'Add student to class',
        classes: results
      });
    });
  });
});

app.get('/quiz', function(req, res) {
  checkPermissions(req.session.user, {view_edit_class: true}, res, function(err) {
    var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
    if(!isAdmin(req)) {
      qString += " AND Users.username = ?";
      qString = client.format(qString, [current_user(req).username]);
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
      else if(req.query.qid) {
        var sql = "SELECT * FROM Quizzes WHERE qid= ?" ;
        client.query(sql, [req.query.qid],function(err2,quizzes) {
          if(err2) {
            req.flash("error",err2);
            res.redirect('back');
          }
          else {
            res.render('add_quiz', {
              title:'Edit Quiz',
              classes: results,
              select: req.query.cid,
              quiz: quizzes[0]
            });
          }
        });
      }
      else {
        res.render('add_quiz', {
          title:'Add Quiz',
          classes: results,
          select: req.query.cid
        });
      }
    });
  });
});

app.get('/quizGrades',function(req,res) {
  var qid = req.query.qid;
  if(qid == undefined) {
    req.flash('error','No Quiz ID Provided');
    res.redirect('back');
  }
  else {
    checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
      client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err,results) {
        if(err) {
          console.log(err);
          req.flash('error',err);
          res.redirect('back');
        }
        else {
          var questions = new Object();
          for(var idx in results) {
            questions[results[idx].questid] = results[idx];
          }
          var sql = "SELECT Users.username, Answers.questid, Answers.saved_answer FROM Users,Answers" +
            " WHERE Users.uid = Answers.uid AND Answers.questid IN (SELECT questid FROM Questions WHERE qid = ?)";
          client.query(sql, [qid], function(err2,answers) {
            if(err2) {
              console.log(err2);
              req.flash('error',err);
              res.redirect('back');
            }
            else {
              res.render('grades', {
                title:"Grade View",
                questions: questions,
                answers: answers
              });
            }
          });
        }
      });
    });
  }
});

app.get('/viewQuiz', function(req, res) {
  var qid = parseInt(req.query.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
    var qString = "SELECT name, cid FROM Quizzes WHERE qid = ?";
    console.log(qString);
    client.query(qString, [qid], function(err, quiz, fields) {
      if(quiz.length != 0) {
        client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err, results, fields) {
          console.log(results);
          res.render('edit_quiz', {
            title: quiz[0].name,
            questions: results,
            qid: qid
          });
        });
      }
      else {
        res.send(404);
      }
    });
  });
});

app.get('/question', function(req, res) {
  var questid = req.query.questid;
  var qid = req.query.qid;
  if(qid == undefined) {
    res.send(404);
  }
  else {
    checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
      if(questid == undefined) {
        res.render(req.query.type, {
          title: '',
          qid: qid,
          answers: '{}', 
          questid: '-1',
          quest: '{}',
          add: true,
          name: ''          
        });
      }
      else {
        var qString = 'SELECT * FROM Questions WHERE qid = ? AND questid = ?';
        qString = client.format(qString, [qid, questid]);
        console.log(qString);
        client.query(qString, function(err, results, fields) {
          var pass = {
            title : '',
            qid: qid,
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
    });
  }
});

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

app.post('/question', function(req, res) {
  var qid = parseInt(req.body.qid);
  checkPermissions(req.session.user, {edit_quiz: qid}, res, function(err) {
    var action = req.body.action;
    var quest = req.body.question;
    var ans = req.body.ans;
    var cor = req.body.correct;
    var type = req.body.type;
    var cat = req.body.cat;
    var diff = req.body.diff;
    var questid = req.body.questid;
    var qString;
    ans = JSON.stringify(ans);
    cor = JSON.stringify(cor);
    if(cor != undefined && cor[0] == '"') {
      cor = '['+cor+']';
    } else if(cor == undefined) {
      cor = '[]';
    }
    if(ans != undefined && ans[0] == '"') {
      ans = '['+ans+']';
    } else if(ans == undefined) {
      ans = '[]';
    }
    console.log(cor);
    console.log(ans);
    if(questid == '-1') {
      qString = "INSERT INTO Questions (qid, type, question, answers, correct_answer, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)";
      qString = client.format(qString, [qid, type, quest, ans, cor, cat, diff]);
    } else {
      qString = "UPDATE Questions SET question = ?, type = ?, answers = ?, correct_answer = ?, category = ?, difficulty = ? WHERE questid = ?";
      qString = client.format(qString, [quest, type, ans, cor, cat, diff, questid]);
    }
    console.log(qString);
    client.query(qString, function(err) {
      if(err) {
        console.log(err);
        res.send(503);
      } else {
        res.redirect('/viewQuiz?qid='+qid);
      }
    });
  });
});

app.post('/quiz', function(req, res) {
  var perms = req.body.qid ? {edit_quiz: req.body.qid} : {add_quiz: true};
  checkPermissions(req.session.user, perms, res, function(err) {
    var qname = req.body.qname;
    var cl = parseInt(req.body.cl);
    var question_amount = req.body.question_amount;
    var foundErr = false;
    if(qname.length <=0 || qname.length > 50) {
      req.flash('error','Quiz Name must be between 1 and 50 characters long');
      foundErr = true;
    }
    question_amount = parseInt(question_amount,10);
    if(isNaN(question_amount)) {
      req.flash('error', 'Question Amount must be a number');
      foundErr = true;
    }
    else if(question_amount <= 0) {
      req.flash('error', 'Question Amount must be a positive number');
    }
    if(foundErr) {
      res.redirect('/quiz');
    }
    else {
      var qString = "SELECT cid FROM Classes WHERE cid = ?";
      client.query(qString, [cl], function(err,results) {
        if(err){
          console.log(err);
          req.flash("error",err);
          res.redirect('/quiz');
        }
        else {
          console.log(results);
          if(req.body.qid) {
            client.query("UPDATE Quizzes SET name= ?, cid = ?, question_amount = ? WHERE qid = ?", [qname, cl, question_amount, req.body.qid], function(err) {
              if(err) {
                console.log(err);
                req.flash("error", err);
              }
              res.redirect('/quizzes?cid=' + cl);
            });
          }
          else {
            client.query("INSERT INTO Quizzes (name, cid, question_amount) VALUES (?, ?, ?)", [qname, cl,question_amount], function(err) {
              if(err) {
                console.log(err);
                req.flash("error",err);
              }
              res.redirect('/quizzes?cid='+ cl);
            });
          }
        }
      });
    }
  });
});

app.get('/', function(req, res){
  res.render('index', {
    title: 'Home'
  });
});

app.get('/users',function(req,res){
  checkPermissions(req.session.user, {view_all_users: true}, res, function(err) {
    var qString = "select * from Users";
    console.log(qString);
    client.query(qString, function(err,results,fields) {
      console.log('render');
      res.render('users', {
        title: 'Users',
        users: results
      });
    });
  });
});

app.post('/updateUser', function(req, res) {
  checkPermissions(req.session.user, {update_user_level: true}, res, function(err) {
    for(var uname in req.body) {
      var level = req.body[uname] === 'Admin' ? ADMIN : (req.body[uname] === 'Professor' ? PROF : STUDENT);
      var qString = 'UPDATE Users SET auth_level = ? WHERE username = ?';
      client.query(qString,[level,uname]);
      console.log(qString);
    }
    res.redirect('/users');
  });
});

app.get('/classes',function(req,res) {
  checkPermissions(req.session.user, {view_classes: true}, res, function(err) {
    qString = "select cid, username, name FROM Classes, Users WHERE Classes.uid = Users.uid";
    if(!isAdmin(req)) {
      qString += " AND Users.username = ?";
      qString = client.format(qString,[current_user(req).username]);
    }
    console.log(qString);
    client.query(qString,function(err,results,fields) {
      res.render('classes', {
        title: 'Classes',
        classes: results
      });
    });
  });
});

app.get('/quizzes',function(req,res) {
  var cid = req.query.cid;
  if(cid !== undefined) {
    checkPermissions(req.session.user, {edit_class: cid}, res, function(err) {
      var qString = "select cid from Classes,Users WHERE Classes.uid = Users.uid AND Classes.cid = ?";
      client.query(qString,[cid],function(err,results,fields){
        if(results.length == 0) {
          res.send(403);
        }
        else {
          var qString = "select qid, Quizzes.question_amount, Quizzes.name, Classes.name AS className FROM Quizzes, Classes WHERE Classes.cid = Quizzes.cid " +
            "AND Quizzes.cid = ?";
          console.log(qString);
          client.query(qString,[cid],function(err,results,fields) {
            console.log(results);
            qString = "select Users.username, Users.uid FROM Class_List, Users WHERE Class_List.uid = Users.uid AND " +
            " Class_List.cid = ?";
            console.log(qString);
            client.query(qString,[cid],function(err2,results2,fields2) {
              console.log(results2);
              res.render('quizzes', {
                title:"Quizzes",
                quizzes: results,
                students: results2,
                cid: cid
              });
            });
          });
        }
      });
    });
  }
  else {
    res.redirect('/');
  }
});

app.get('/studentList', function(req, res) {
  client.query("SELECT uid, username FROM Users", function(err, results) {
    res.send(results);
  });
});

app.get('/login',function(req,res){
  console.log('req');
  if(typeof(current_user(req)) != 'undefined'){
    res.redirect("/");
  }else{
    res.render('login',{
      title:'Login',
      layout:false
    });
  }
});

app.post('/test-login',function(req,res){
  if(config.requireLogin){
    res.redirect('/login');
  }else{
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

app.get('/logout',function(req,res){
  res.cookie('its-login-username','',{
    expires: new Date(Date.now() - 1000),
  });
  res.cookie('its-login-username','',{
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
