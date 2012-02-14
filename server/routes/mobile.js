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

app.get('/mobile/quiz', function(req,res){
  var qid = req.query.qid;
  if(qid == undefined){
    res.send(500);
  }else{
    var qString = "SELECT * FROM Questions WHERE Questions.qid = ?";
    client.query(qString,[qid],function(err,results){
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

app.get('/mobile/answers', function(req, res) {
  var user = req.query.user;
  var answer = req.query.answer;
  var questid = req.query.questid;
  //no response needed, 200 will remove the request from the Q, 500 will return it
  if(user == undefined || answer == undefined || questid == undefined){
    res.send(200);
  }else{
    user = crypt.decrypt(user);
    client.query("SELECT uid FROM Users WHERE username = ?",[user],function(err,results,fields){
      if(err){
        console.log(err);
        res.send(500);
      }else if(results.length == 0){
        console.log("No user found");
        res.send(200);
      }else{
        client.query("INSERT INTO Answers(uid,questid,saved_answer) VALUES(?,?,?)",[results.uid,questid,answer],function(err2,results){
          if(err2){
            console.log(err2);
            res.send(500);
          }else{
            res.send(200);
          }
        });
      }
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
