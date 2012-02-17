/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var app = module.exports = express.createServer();
var config = require('./config')
/*var app = module.exports = express.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});
*/
var client = mysql.createClient(config.db);
client.query('USE ' + config.db.database);


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
      req.session.user.userid = rows[0].uid;
      req.session.user.auth = rows[0].auth_level;
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
  current_user: current_user,
  base_url: function(){return "http://itutor.radford.edu:" + config.port},
  isAdmin: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 2; },
  isProf: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 1; },
  isStudent: function(req, res) { return req.session.user == undefined ? false : req.session.user.auth == 0; },
  requireLogin: function(){return config.requireLogin},
  errors: function(req,res){return req.flash("error")}
});

var isAdmin = function(req) {
	return req.session.user.auth == 2;
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

var getOwnerOfClass = function(class_id, callback) {
  var qString = "select Users.username from Classes,Users WHERE Classes.uid = Users.uid AND Classes.cid = ?";
  client.query(qString,[class_id],function(err,results){
    if(err)                       callback(err);
    else if(results.length == 0)  callback(new Error("No results for get owner of class query"));
    else                          callback(err, results[0].username);
  });
}
// Routes

app.get('*',requireLogin);
app.put('*',requireLogin);
app.post('*',requireLogin);
require('./routes/index')(app,client);


app.get('/admin', function(req, res) {
  authCheck(req,function(auth_level){  
    if(auth_level == 2) {
			res.render('control_panel', {
				title: 'Admin Panel'
			});
		} else {
			res.send(403);
		}
	});
});

app.get('/class', function(req, res) {
	authCheck(req,function(auth_level){
    if(auth_level > 0){
      var qString = "SELECT username,uid FROM Users WHERE username = '" + current_user(req) + "'";
      client.query(qString,function(err,results){
        if(req.query.cid){
          var sqlStr = "SELECT * FROM Classes WHERE cid = ?";
          if(auth_level < 2){
            sqlStr += " AND uid = ?";
            sqlStr = client.format(sqlStr, [req.query.cid,results[0].uid]);
          }else{
            sqlStr = client.format(sqlStr, [req.query.cid]);
          }
          client.query(sqlStr,function(err2,classes){
            if(err2){
              req.flash("error",err2);
              res.redirect('/classes');
            }else if(classes.length == 0){
              req.flash("error","Class does not exist or you do not have access to it");
              res.redirect('/classes');
            }else{
              res.render('add_class',{
                title:'Edit Class',
                auth_level: user.auth,
                tuid: results[0].uid,
                theClass: classes[0]
              });
            }
          });
        }else{
          res.render('add_class', {
            title: 'Class Add Panel',
            auth_level: user.auth,
            tuid: results[0].uid
		      });
        }
      });
	  } else {
		  res.send(403);
	  }
  });
});

app.post('/user', function(req, res) {
  var auth = req.body.priv;
	var user = req.body.user;
  var foundErr = false;
  if(typeof(user) != 'string' || user.length <=0 || user.length > 20){
    req.flash("error","Username must be between 1 and 20 characters long");
    res.redirect('/admin');
  }else{
	  client.query("INSERT INTO Users (username, auth_level) VALUES (?,?)", [user,auth],function(err) {
		  if(err) {
			  console.log(err);
        req.flash("error",err);
        res.redirect('/admin');
		  }else{
		    res.redirect('/users');
      }
	  });
  }
});

app.post('/class', function(req, res) {
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      var name = req.body.cname;
      var tuser = req.body.tuser;
      var limit = req.body.limit;
      var priv = req.body.priv;
      var foundErr = false;
      if(name.length <= 0 || name.length > 30){
        req.flash("error","Class Name must be between 1 and 30 characters long");
        foundErr = true;
      }
      if(isNaN(parseInt(limit,10)) || parseInt(limit,10) <=0){
        req.flash("error","Class Limit must be a positive number");
        foundErr=true;
      }
      if(foundErr){
        res.redirect('/classes');
      }else{
        if(req.body.cid){
          var cid = req.body.cid;
          getOwnerOfClass(cid, function(err, currentOwner) {
            if(auth_level == 1 && (current_user(req).username != currentOwner)) {
              req.flash("error", "You do not have permission to edit classes that do not belong to you");
              foundErr = true;
            }
            if(foundErr){
              res.redirect('/classes');
            }else{
              client.query("UPDATE Classes SET name = ?,classlimit = ?,privacy = ? ,uid= ? WHERE cid = ?",
                           [name,limit,priv,tuser,cid],function(err){
                if(err){
                  console.log(err);
                  req.flash("error",err);
                }
                res.redirect('/classes');
              });
            }
          });
        }else{
          client.query("INSERT INTO Classes (uid, name, classlimit, privacy) " + 
                   "VALUES (?,?,?,?)",[tuser,name,limit,priv], function(err) {
            if(err) {
              console.log(err);
              req.flash("error",err);
            }
            res.redirect('/classes');
          });
        }
      }
    } else res.send(403);
  });
});

app.get('/remUser',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level > 1){
      var uid = req.query.uid;
      if(uid != undefined){
        var qString = "DELETE FROM Users WHERE uid = ?";
        console.log(qString);
        client.query(qString,[uid],function(err){
          if(err) console.log(err);
        });
      }
      res.redirect('/users');
    }else res.send(403);
  });
});
app.get('/remStud',function(req, res){
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      var cid = req.query.cid;
      var uid = req.query.uid;
      console.log(qString);
      if(cid != undefined && uid != undefined){
        var qString = "DELETE FROM Class_List WHERE cid = ? AND uid = ?";
        client.query(qString, [cid, uid], function(err) {
          if(err) console.log(err);
        });
      }
      res.redirect('/quizzes?cid=' + cid);
    }else res.send(403);
  });
});

app.get('/remQuiz',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      var qid = req.query.qid;
      if(qid != undefined){
        var qString = "SELECT qid, Classes.cid FROM Quizzes, Classes WHERE Classes.cid = Quizzes.cid" +
          " AND qid = '" + qid + "'";
        if(auth_level < 2){
          qString += " AND Classes.cid IN (SELECT Classes.cid FROM Classes, Users WHERE Classes.uid = Users.uid AND Users.username = ?)";
          qString = client.format(qString,[current_user(req).username]);
        }
        console.log(qString);
        client.query(qString,function(err,results,fields){
          if(err){
            console.log(err);
            req.flash("error",err);
            res.redirect('/');
          }else if(results.length > 0){
            console.log(results);
            client.query("DELETE FROM Quizzes WHERE qid = ?",[qid],function(err){
              console.log(err);
              res.redirect('/quizzes?cid=' + results[0].cid);
            });
          }else res.redirect('/');
        });
      } else res.redirect('/');
    }else{
      res.send(403);
    }
  });
});
app.get('/remClass',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level>0){
      var cid = req.query.cid;
      if(cid != undefined){
        var qString = "SELECT Classes.cid, Users.username From Classes,Users WHERE Classes.uid = Users.uid " +
          "AND Classes.cid = ?";
        if(auth_level < 2){
          qString += " AND Users.username = ?";
          qString = client.format(qString,[cid,current_user(req).username]);
        }else{
          qString = client.format(qString,[cid]);
        }
        console.log(qString);
        client.query(qString,function(err,results,fields){
          if(results.length >0){
            if(results[0].username = current_user(req).username || auth_level > 1){
              var qString ="DELETE FROM Classes WHERE cid = ?";
              console.log(qString);
              client.query(qString,[cid],function(err){
                if(err){
                  console.log(err);
                }
                res.redirect('/classes');
              });
            }else{
              res.send(403);
            } 
          }else{
            res.redirect('/classes');
          }
        });
      }else{
        res.redirect('/classes');
      }
    }else{
      res.send(403);
    }
  });
});

app.post('/student', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level > 0 ) {
      var user = req.body.user;
      var cid = req.body.cid;
      client.query("SELECT uid FROM Users WHERE username = ?", [user],function(err, results) {
        if(err) {
          console.log(err);
        } else {
          var uid = results[0].uid;
          client.query("INSERT INTO Class_List (uid, cid) VALUES (?,?)", [uid,cid],function(err) {
            if(err) {
              console.log(err);
            }
          });
        }
        res.redirect('/student');
      });
    } else {
      res.send(403);
    }
  });
});

app.get('/student', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level > 0) {
      var qString = "SELECT cid, Classes.name FROM Classes, Users WHERE Classes.uid = Users.uid";
      if(auth_level < 2) {
        qString += " AND Users.username = ?";
        qString = client.format(qString,[current_user(req).username]);
      }
      client.query(qString, function(err, results, fields) {
        console.log(results);
        res.render('student_class', {
          title: 'Add student to class',
          classes: results
        });
      });
    } else {
      res.send(403);
    }
  });
});

app.get('/quiz', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level > 0) {
	    var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
      if(auth_level < 2){
        qString += " AND Users.username = ?";
        qString = client.format(qString,[current_user(req).username]);
      }
      client.query(qString, function(err,results,fields){
        if(err){
          req.flash("error",err);
          res.redirect('/classes');
        }else if (results.length == 0){
          req.flash('error', "class doesn't exist or does not belong to you");
          res.redirect('back');
        }else if(req.query.qid){
          var sql = "SELECT * FROM Quizzes WHERE qid= ?" ;
          client.query(sql, [req.query.qid],function(err2,quizzes){
            if(err2){
              req.flash("error",err2);
              res.redirect('back');
            }else{
              res.render('add_quiz',{
                title:'Edit Quiz',
                classes: results,
                select: req.query.cid,
                quiz: quizzes[0]
              });
            }
          });
        }else{
          res.render('add_quiz',{
            title:'Add Quiz',
            classes: results,
            select: req.query.cid
          });
         }
      });
	  } else {
		  res.send(403);
	  }
  });
});

app.get('/quizGrades',function(req,res) {
  var qid = req.query.qid;
  if(qid == undefined){
    req.flash('error','No Quiz ID Provided');
    res.redirect('back');
  }else{
    client.query("SELECT * FROM Questions WHERE qid = ?", [qid],function(err,results){
      if(err){
        console.log(err);
        req.flash('error',err);
        res.redirect('back');
      }else{
        var questions = new Object();
        for(var idx in results){
          questions[results[idx].questid] = results[idx];
        }
        var sql = "SELECT Users.username, Answers.questid, Answers.saved_answer FROM Users,Answers" +
          " WHERE Users.uid = Answers.uid AND Answers.questid IN (SELECT questid FROM Questions WHERE qid = ?)";
        client.query(sql,[qid],function(err2,answers){
          if(err2){
            console.log(err2);
            req.flash('error',err);
            res.redirect('back');
          }else{
            res.render('grades',{
              title:"Grade View",
              questions: questions,
              answers: answers
            });
          }
        });
      }
    });
  }
});

app.get('/viewQuiz', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level > 0) {
      var qid = req.query.qid;
      var edit = req.query.edit;
      var qString = "SELECT name, cid FROM Quizzes WHERE qid = ?";
      qString = client.format(qString, [qid]);
      console.log(qString);
      client.query(qString, function(err, quiz, fields) {
        if(quiz.length != 0) {
          getOwnerOfClass(quiz[0].cid, function(err, owner) {
            if(auth_level == 2 || owner == current_user(req).username) {
              client.query(client.format("SELECT * FROM Questions WHERE qid = ?",[qid]), function(err, results, fields) {
                console.log(results);
                res.render('edit_quiz', {
                  title: quiz[0].name,
                  questions: results,
                  qid: qid
                });
              });
            }
            else {
              res.send(403);
            }
          });
        } else {
          res.send(404);
        }
      });
    } else {
      res.send(403);
    }
  });
});

app.get('/question', function(req, res) {
  authCheck(req, function(auth_level) {
    var questid = req.query.questid;
    var qid = req.query.qid;
    if(qid == undefined) {
      res.send(404);
    } else {
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
      } else {
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
          } else if(results[0].type == 'multi') {
            res.render('multi', pass)
          } else if(results[0].type == 'tf') {
            res.render('tf', pass);
          } else {
            console.log('Could not find questid = '+questid+' and qid = '+qid);
            res.send(503);
          } 
        });
      }
    }
  });
});

app.del('/question', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level >= 1) {
      var questid = req.body.questid;
      console.log(questid);
      var qString = 'DELETE FROM Questions WHERE questid = ?';
      qString = client.format(qString, [questid]);
      client.query(qString, function(err) {
        if(err) {
          console.log(err);
          res.send(503);
        } else {
          res.send(200);
        }
      });
    } else {
      res.send(403);
    }
  });
});

app.post('/question', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level >= 1) {
      var action = req.body.action;
      var quest = req.body.question;
      var qid = req.body.qid;
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
    }else{
      res.send(403);
    }
  });
});

app.post('/quiz', function(req, res) {
  authCheck(req, function(auth_level) {
    var qname = req.body.qname;
    var cl = req.body.cl;
    var question_amount = req.body.question_amount;
    var foundErr = false;
    if(qname.length <=0 || qname.length > 50){
      req.flash('error','Quiz Name must be between 1 and 50 characters long');
      foundErr = true;
    }
    question_amount = parseInt(question_amount,10);
    if(isNaN(question_amount)){
      req.flash('error', 'Question Amount must be a number');
      foundErr = true;
    }else if(question_amount <= 0){
      req.flash('error', 'Question Amount must be a positive number');
    }
    if(foundErr){
      res.redirect('/quiz');
    }else{
      var qString = "SELECT cid FROM Users, Classes WHERE Users.uid = Classes.uid AND cid=? ";
      if(auth_level < 2){
        qString += " AND username= ?";
        qString = client.format(qString,[cl,current_user(req).username]);
      }else{
        qString = client.format(qString,[cl]);
      }
      client.query(qString,function(err,results){
        if(err){
          console.log(err);
          req.flash("error",err);
          res.redirect('/quiz');
        }else{
          console.log(results);
          if(results.length <= 0){
            req.flash("error","You can only create quizzes for your own classes");
            res.redirect('/quiz');
          }else{
            if(req.body.qid){
              client.query("UPDATE Quizzes SET name= ?, cid = ?, question_amount = ? WHERE qid = ?", [qname,cl,question_amount,req.body.qid],function(err){
                if(err){
                  console.log(err);
                  req.flash("error",err);
                }
                res.redirect('/quizzes?cid=' + cl);
              });
            }else{
              client.query("INSERT INTO Quizzes (name, cid,question_amount) VALUES (?,?,?)", [qname,cl,question_amount],function(err) {
                if(err) {
                  console.log(err);
                  req.flash("error",err);
                }
                res.redirect('/quizzes?cid='+ cl);
              });
            }
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
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      var qString = "select * from Users";
      console.log(qString);
      client.query(qString,function(err,results,fields){
        console.log('render');
        res.render('users',{
          title: 'Users',
          users: results
        });
      });
    }else{
      res.send(403);
    }
  });
});

app.post('/updateUser', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level == 2) {
      for(var uname in req.body) {
        var level = req.body[uname] == 'Admin' ? 2 : (req.body[uname] == 'Professor' ? 1 : 0);
        var qString = 'UPDATE Users SET auth_level= ? WHERE username= ?';
        client.query(qString,[level,uname]);
        console.log(qString);
      }
      res.redirect('/users');
    }
  });
});

app.get('/classes',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      qString = "select cid,username,name FROM Classes,Users WHERE Classes.uid = Users.uid";
      if(auth_level < 2){
        qString += " AND Users.username = ?";
        qString = client.format(qString,[current_user(req).username]);
      }
      console.log(qString);
      client.query(qString,function(err,results,fields){
        res.render('classes',{
          title: 'Classes',
          classes: results
        });
      });
    }else{
      res.send(403);
    }
  });
});

app.get('/quizzes',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      var cid = req.query.cid;
      if(cid != undefined){
        var qString = "select cid from Classes,Users WHERE Classes.uid = Users.uid AND Classes.cid = ?";
        if(auth_level == 1) {
          qString += "AND Users.username = '" + current_user(req).username + "'";
        }
        client.query(qString,[cid],function(err,results,fields){
          if(results.length == 0){
            res.send(403);
          }else{
            var qString = "select qid,Quizzes.question_amount,Quizzes.name, Classes.name AS className FROM Quizzes, Classes WHERE Classes.cid = Quizzes.cid " + 
              "AND Quizzes.cid = ?";
            if(auth_level < 2){
              qString += " AND Classes.cid IN (Select cid FROM Classes,Users where Classes.uid = Users.uid " + 
              "AND Users.username = '" + current_user(req).username + "')";
            }
            console.log(qString);
            client.query(qString,[cid],function(err,results,fields){
              console.log(results);
              qString = "select Users.username, Users.uid FROM Class_List, Users WHERE Class_List.uid = Users.uid AND " + 
              " Class_List.cid = ?";
              console.log(qString);
              client.query(qString,[cid],function(err2,results2,fields2){
                console.log(results2);
                res.render('quizzes',{
                  title:"Quizzes",
                  quizzes: results,
                  students: results2,
                  cid: cid
                });
              });
            });
          }
        });
      }else{
        res.redirect('/');
      }
    }else{
      res.send(403);
    }
  });
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
