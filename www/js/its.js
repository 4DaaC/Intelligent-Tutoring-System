var cname = 'its-login-username'; 
var baseUrl = "http://rucs.radford.edu:3000";
getUsername = function(){
  var storage = window.localStorage;
  return storage.getItem(cname);
}

setUsername = function(username){
  var storage = window.localStorage;
  storage.setItem(cname,username);

}

loggedIn = function(){
  return getUsername() != null;
}

logoutUser = function(){
  window.localStorage.removeItem(cname);
}

goBack = function(){
  history.go(-1);
}

setProfs = function(profObject){
  var storage = window.localStorage;
  storage.setItem(getUsername() + ":Professors",JSON.stringify(profObject));
}
getProfs = function(){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":Professors"));
}
downloadProfs = function(callback){
  var url = baseUrl + "/mobile/profs?user=" + escape(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    success:function(data){
      setProfs(data);
      callback(data);
    },
    error:function(){
      callback(null,"Problem Downloading Professors");
    }
  });
}

setClasses = function(profName,classesObject){
  var storage = window.localStorage;
  storage.setItem(getUsername() + ":" + profName + ":Classes",JSON.stringify(classesObject));
}

getClasses = function(profName){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":" + profName + ":Classes"));
}

downloadClasses = function(profName,callback){
  var url = baseUrl + "/mobile/classes?prof=" + escape(encrypt(profName)) + "&user=" + escape(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    success:function(data){
      setClasses(profName,data);
      callback(data);
    },
    error:function(){
      callback(null,"Problem Downloading Classes");
    }
  });
  
}

setQuizzes = function(cid,quizzesObject){
  var storage = window.localStorage;
  storage.setItem(getUsername() + ":" + cid + ":Quizzes",JSON.stringify(quizzesObject));
}

getQuizzes = function(cid){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":" + cid + ":Quizzes"));
}

downloadQuizzes = function(cid,callback){
  var url = baseUrl + "/mobile/quizzes?cid=" + escape(cid) + "&user=" + escape(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    success:function(data){
      setQuizzes(cid,data);
      callback(data);
    },
    error:function(){
      callback(null,"Problem Downloading Quizzes");
    }
  });
  
}


