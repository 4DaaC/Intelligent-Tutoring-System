
/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var mysql = require('mysql');

var app = module.exports = express.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});

var client = mysql.createClient({
  user: 'softeng11',
  host: 'localhost',
  password: 'softengdb11'
});

client.query('USE softeng11');

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

// Routes
app.post('/student', function(req, res) {
  var user = req.body.username;
  console.log(req.body.username);
  client.query("INSERT INTO Users (username, auth_level) VALUES ('"+user+"', '8')",
    function(err, result, fields) {
      console.log("HERE");
      if(err) {
        console.log(err);
        res.json({});
      } else {
	console.log(result);
	res.json({id: result.insertId});
      }
  });
});

app.post('/admin', function(req, res) {

});

app.post('/prof', function(req, res) {

});

app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
