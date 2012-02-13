var cname = 'its-login-username'; 
var baseUrl = "http://itutor.radford.edu:3002";

itsLogin = function(user){
    setUsername(user);
    $('#login-frame').attr('src','').hide();
    $('#logged span').html(user);
    $('#logged').show();
    $('#logout-button').show();
}

iframeOnload = function(){
    var storage = window.localStorage;
    var username= loggedIn() ? 
      getUsername() : $('#login-frame').contents().find('#user').html();
    if(username != null){
      itsLogin(username);
    }
}

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
  var url = baseUrl + "/mobile/profs?user=" + encodeURIComponent(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    async:false,
    success:function(data){
      console.log("Passed AJAX");
      callback(data);
    },
    error:function(){
      console.log("errored AJAX");
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
  var url = baseUrl + "/mobile/classes?prof=" + encodeURIComponent(encrypt(profName)) + "&user=" + encodeURIComponent(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    async:false,
    success:function(data){
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
  var url = baseUrl + "/mobile/quizzes?cid=" + encodeURIComponent(cid) + "&user=" + encodeURIComponent(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    async:false,
    success:function(data){
      callback(data);
    },
    error:function(){
      callback(null,"Problem Downloading Quizzes");
    }
  });
  
}

setQuiz = function(qid,quizObject){
  var storage = window.localStorage;
  storage.setItem(getUsername() + ":Quiz:" + qid);
}

getQuiz = function(qid){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":Quiz:" + qid));
}

downloadQuiz = function(qid,callback){
  var url = baseUrl + "/mobile/quiz?qid=" + encodeURIComponent(qid) + "&user=" + encodeURIComponent(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    async:false,
    success:function(data){
      callback(data);
    },
    error:function(){
      callback(null,"Problem Downloading Quiz");
    }
  });
}


