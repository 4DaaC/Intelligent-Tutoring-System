var crypt = require('../crypt.js');
module.exports = function(app,client){
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
				 					"WHERE username = ?)",[user], function(err, results, fields) {
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
      "Quizzes.cid IN (SELECT cid FROM (Class_List a NATURAL JOIN Users b) WHERE username = ?)";
    console.log(qString);
    client.query(qString,[user], function(err,results,fields){
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
		client.query("SELECT name, cid, classlimit FROM Classes", function(err, results, fields) {
						console.log(results);
						res.send(results);
					 });
	} else if(user == undefined) {
		client.query("SELECT name, cid, classlimit "+
				 	 "FROM Classes "+
				 	 "WHERE uid IN (SELECT uid "+
				 			  	   "FROM Users "+
							  	   "WHERE username = ?)", [prof],function(err, results, fields) {
						console.log(results);						  
						res.send(results);
					});
	} else if(prof == undefined) {
		client.query("SELECT name, cid, classlimit "+
				 	 "FROM Classes "+
					 "WHERE cid IN (SELECT cid "+
					 			   "FROM Class_List NATURAL JOIN Users "+
								   "WHERE username = ?)",[user], function(err, results, fields) {
						console.log(results);
						res.send(results);
					});
	} else {
		client.query("SELECT name, cid, classlimit "+
					 "FROM Classes "+
					 "WHERE cid IN (SELECT cid "+
					 			   "FROM Class_List NATURAL JOIN Users "+
					 			   "WHERE username = ?) AND uid IN (SELECT uid FROM Users WHERE username = ?)"
				 	 , [user,prof],function(err, results, fields) {
			console.log(results);		
			res.send(results);
		});
	}
});
}
