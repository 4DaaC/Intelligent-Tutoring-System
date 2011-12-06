
/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var crypt = require('./crypt.js');
var app = module.exports = express.createServer();

/*var app = module.exports = express.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});
*/
var client = mysql.createClient({
  user: 'mjrohr',
  host: 'php.radford.edu',
  password: 'rohrdb1',
  database: 'mjrohr'
});

client.query('USE mjrohr');


var current_user = function(req){
  if(req.cookies['its-login-username'] && !req.session.user){
    req.session.user = new Object();
    req.session.user.username = req.cookies['its-login-username'];
	//Here we can setup more info about the user from the db, like if they are a professor
  }if(req.session.user && req.session.user.username){
	  return req.session.user.username;
  }else return undefined;
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
  current_user: current_user
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
  console.log(req.route);
  if(isRequestMobile(req) || typeof(current_user(req)) !='undefined' || req.route.params[0] == '/login'){
    next();
  }else{
    res.redirect("/login");
  }
}

app.get('*',requireLogin);
app.put('*',requireLogin);
app.post('*',requireLogin);

// Routes
app.get('/mobile/profs', function(req, res) {
	if(req.query.user == undefined) { 
		client.query("SELECT username, uid "+
				 "FROM Users "+
				 "WHERE auth_level = 1", function(err, results, fields) {
					console.log(results);
					res.send(results);				
				});
	} else {
		var user = crypt.decrypt(req.query.user);
		client.query("SELECT username, uid "+
					 "FROM Users NATURAL JOIN Classes "+
					 "WHERE cid IN (SELECT cid "+ 
					 				"FROM (Class_List a NATURAL JOIN Users b) "+
				 					"WHERE username = '"+user+"')", function(err, results, fields) {
			console.log(results);
			res.send(results);
		});
	}
});

app.get('/mobile/quizzes', function(req, res) {
  var cid = req.query.cid;
  var user = req.query.user;
  if(user == undefined || cid == undefined){
    req.send(500);
  }else{
    user = crypt.decrypt(user).toLowerCase();
    var qString = "SELECT qid,Quizzes.name FROM Quizzes,Classes WHERE Quizzes.cid = Classes.cid AND Quizzes.cid = '" + cid + "' AND " + 
      "Quizzes.cid IN (SELECT cid FROM (Class_List a NATURAL JOIN Users b) WHERE username = '" + user + "')";
    console.log(qString);
    client.query(qString, function(err,results,fields){
        console.log(results);
        res.send(results);
      });
  }
});

app.get('/mobile/classes', function(req, res) {
	var prof = req.query.prof;
	var user = req.query.user;
  if(user != undefined){
    user = crypt.decrypt(user);
  }
  if(prof != undefined){
    prof = crypt.decrypt(prof);
  }
	if(prof == undefined && user == undefined) {
		client.query("SELECT name, cid, classlimit "+
					 "FROM Classes", function(err, results, fields) {
						console.log(results);
						res.send(results);
					 });
	} else if(user == undefined) {
		client.query("SELECT name, cid, classlimit "+
				 	 "FROM Classes "+
				 	 "WHERE uid IN (SELECT uid "+
				 			  	   "FROM Users "+
							  	   "WHERE username = '"+prof+"')", function(err, results, fields) {
						console.log(results);						  
						res.send(results);
					});
	} else if(prof == undefined) {
		client.query("SELECT name, cid, classlimit "+
				 	 "FROM Classes "+
					 "WHERE cid IN (SELECT cid "+
					 			   "FROM Class_List NATURAL JOIN Users "+
								   "WHERE username = '"+user+"')", function(err, results, fields) {
						console.log(results);
						res.send(results);
					});
	} else {
		client.query("SELECT name, cid, classlimit "+
					 "FROM Classes "+
					 "WHERE cid IN (SELECT cid "+
					 			   "FROM Class_List NATURAL JOIN Users "+
					 			   "WHERE username = '"+user+"') AND uid IN (SELECT uid FROM Users WHERE username = '"+prof+"')"
				 	 , function(err, results, fields) {
			console.log(results);		
			res.send(results);
		});
	}
});
var authCheck = function(req,callback){
  var qString = "SELECT auth_level FROM Users WHERE username = '"+req.session.user.username+"'";
	var q = client.query(qString,function(err,results,fields) {
    if(results.length == 1) {
      callback(results[0].auth_level);
    }else{
      callback(0);
    }
  });
}

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
        res.render('add_class', {
			    title: 'Class Add Panel',
          auth_level: auth_level,
          tuid: results[0].uid
		    });
      });
	  } else {
		  res.send(403);
	  }
  });
});

app.post('/user', function(req, res) {
  	var auth = req.body.priv;
	var user = req.body.user;
	client.query("INSERT INTO Users (username, auth_level) VALUES ('"+user+"','"+auth+"')", function(err) {
		if(err) {
			console.log(err);
		}
		res.redirect('/admin');
	});
});

app.post('/class', function(req, res) {
	var name = req.body.cname;
	var tuser = req.body.tuser;
	var limit = req.body.limit;
	var priv = req.body.priv;
	client.query("INSERT INTO Classes (uid, name, classlimit, privacy) VALUES ('"+tuser+"','"+name+"','"+limit+"','"+priv+"')", function(err) {
		if(err) {
			console.log(err);
		}
		res.redirect('/classes');
	});
});
app.get('/remUser',function(req,res){

  authCheck(req,function(auth_level){
    if(auth_level > 1){
      var uid = req.query.uid;
      if(uid != undefined){
        var qString = "DELETE FROM Users WHERE uid = '" + uid + "'";
        console.log(qString);
        client.query(qString,function(err){
          if(err) console.log(err);
        });
      }
      res.redirect('/users');
    }else res.send(403);
  });
});
app.get('/remClass',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level>0){
      var cid = req.query.cid;
      if(cid != undefined){
        var qString = "SELECT Classes.cid, Users.username From Classes,Users WHERE Classes.uid = Users.uid " +
          "AND Classes.cid = '" + cid + "'";
        if(auth_level < 2){
          qString += " AND Users.username = '" + current_user(req) + "'";
        }
        console.log(qString);
        client.query(qString,function(err,results,fields){
          if(results.length >0){
            if(results[0].username = current_user(req) || auth_level > 1){
              var qString ="DELETE FROM Classes WHERE cid = '" + cid + "'";
              console.log(qString);
              client.query(qString,function(err){
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

app.get('/quiz', function(req, res) {
  authCheck(req, function(auth_level) {
    if(auth_level > 0) {
	    var qString = "SELECT cid,Classes.name FROM Classes,Users WHERE Classes.uid = Users.uid";
      if(auth_level < 2){
        qString += " AND Users.username = '" + current_user(req) + "'";
      }
      client.query(qString, function(err,results,fields){
        res.render('add_quiz',{
          title:'Add Class Panel',
          classes: results
        });
      });
	  } else {
		  res.send(403);
	  }
  });
});

app.post('/quiz', function(req, res) {
 var qname = req.body.qname;
 var cl = req.body.cl;
 client.query("INSERT INTO Quizzes (name, cid) VALUES ('"+qname+"', '"+cl+"')", function(err) {
	if(err) {
	  console.log(err);
	}
	res.redirect('/quiz');
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
app.get('/classes',function(req,res){
  authCheck(req,function(auth_level){
    if(auth_level > 0){
      qString = "select cid,username,name FROM Classes,Users WHERE Classes.uid = Users.uid";
      if(auth_level < 2){
        qString += " AND Users.username = '" + current_user(req) + "'";
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
        var qString = "select qid,Quizzes.name, Classes.name AS className FROM Quizzes, Classes WHERE Classes.cid = Quizzes.cid " + 
          "AND Quizzes.cid = '" + cid + "'";
        if(auth_level < 2){
          qString += " AND Classes.cid IN (Select cid FROM Classes,Users where Classes.uid = Users.uid " + 
          "AND Users.username = '" + current_user(req) + "')";
        }
        console.log(qString);
        client.query(qString,function(err,results,fields){
          console.log(results);
          res.render('quizzes',{
            title:"Quizzes",
            quizzes: results
          });
        });
      }else{
        res.redirect('/');
      }
    }else{
      res.send(403);
    }
  });
});

app.get('/login',function(req,res){
  console.log('req');
  if(typeof(current_user(req)) != 'undefined'){
    res.redirect("/");
  }else{
    res.render('login',{
      title:'Login'
    });
  }
});

app.get('/logout',function(req,res){
 res.cookie('its-login-username','',{
   expires: new Date(Date.now() - 1000),
   path:'/',
   domain:'.radford.edu',
   httponly:'1'
  });
 req.session.destroy();
 res.redirect('/');
});
app.listen(3004);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
