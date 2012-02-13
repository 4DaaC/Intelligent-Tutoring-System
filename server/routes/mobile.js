var crypt = require('../crypt.js');
module.exports = function(app,client){
app.get('/mobile/profs', function(req, res) {
	if(req.query.user == undefined) { 
		client.query("SELECT username, uid "+
				 "FROM Users "+
				 "WHERE auth_level = 1", function(err, results, fields) {
					if(err){
            console.log(err);
            res.send(500);
          }else{
            console.log(results);
				  	res.send(results);				
          }
				});
	} else {
		var user = crypt.decrypt(req.query.user);
		var sqlString = "SELECT username, uid "+
					 "FROM Users NATURAL JOIN Classes "+
					 "WHERE cid IN (SELECT cid "+ 
					 				"FROM (Class_List a NATURAL JOIN Users b) "+
				 					"WHERE username = ?)";
    console.log('user: ' + user);
    client.query(sqlString,[user], function(err, results, fields) {
			if(err){
            console.log(err);
            res.send(500);
          }else{
            console.log(results);
				  	res.send(results);				
          }
		});
	}
});

app.get('/mobile/quiz', function(req,res){
  var qid = req.query.qid;
  var user = req.query.user;
  if(qid == undefined || user == undefined){
    console.log("undefined");
    res.send(500);
  }else{
    var user = crypt.decrypt(user);
    console.log("User = " + user);
    client.query("SELECT * FROM Questions WHERE qid = ?", [qid], function(err,questions){
      if(err){
        console.log(err);
        res.send(500);
      }else{
        var sqlString = "SELECT Answers.questid, Answers.saved_answer FROM Answers,Questions,Users WHERE " +
           "Users.username = ? AND Questions.qid = ? AND Users.uid = Answers.uid AND Answers.questid = Questions.questid";
        client.query(sqlString,[user,qid],function(errors,answers){
          if(errors){
            console.log(errors);
            res.send(500);
          }else{
            res.send({questions:questions, answers:answers});
          }
        });
      }
    });
  }
});
app.get('/mobile/test', function(req,res){res.send('hello world')});
app.get('/mobile/quizzes', function(req, res) {
  var cid = req.query.cid;
  var user = req.query.user;
  if(user == undefined || cid == undefined){
    res.send(500);
  }else{
    user = crypt.decrypt(user).toLowerCase();
    var qString = "SELECT Quizzes.* FROM Quizzes,Classes WHERE Quizzes.cid = Classes.cid AND Quizzes.cid = '" + cid + "' AND " + 
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
						if(err){

            }
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
