
/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var crypt = require('./crypt.js');
var app = module.exports = express.createServer();
var app = module.exports = express.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});

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
    //here we can setup more info about the user from the db, like if they are a professor
  }if(req.session.user && req.session.user.username){
    return req.session.user.username
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

var isRequestMobile = function(req){
  var paramArray = req.route.params[0].split('/');
  if(paramArray.length >=2 && paramArray[1] == 'mobile'){
    return true;
  }else return false;
}
var requireLogin = function(req,res,next){
  console.log(req.route);
  if(isRequestMobile || typeof(current_user(req)) !='undefined' || req.route.params[0] == '/login'){
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
	var user = crypt.decrypt(req.query.user);
	client.query("SELECT username, uid "+
				 "FROM Users NATURAL JOIN Classes "+
				 "WHERE cid IN (SELECT cid "+ 
				 				"FROM (Class_List a NATURAL JOIN Users b) "+
				 				"WHERE username = '"+user+"')", function(err, results, fields) {
		res.send(results);
	});
});

app.post('/admin', function(req, res) {

});

app.post('/prof', function(req, res) {

});

app.get('/', function(req, res){
  console.log(crypt.encrypt("joel"));
  res.render('index', {
    title: 'Express'
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
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
