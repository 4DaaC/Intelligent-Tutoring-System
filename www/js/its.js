var cname = 'its-login-username'; 
baseUrl = "http://itutor.radford.edu:3000";
itsLogin = function(user){
    setUsername(user);
    $('#login-frame').attr('src','').hide();
    $('#logged span').html(user);
    $('#logged').show();
    $('#logout-button').show();
    window.scroll(0,0);s
}

iframeOnload = function(){
    var storage = window.localStorage;
    var username= loggedIn() ? 
      getUsername() : $('#login-frame').contents().find('#user').html();
    if(username != null){
      itsLogin(username);
    }
}

setCurrentQid = function(qid){
  var storage = window.localStorage;
  storage.setItem('curr-quiz',qid);
}

getCurrentQid = function(){
  var storage = window.localStorage;
  return storage.getItem('curr-quiz');
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
  var profs = new Object();
  for(var idx in profObject){
    var prof = profObject[idx];
    profs[prof.username] = prof; 
  }
  storage.setItem(getUsername() + ":Professors",JSON.stringify(profs));
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
  var classes = new Object();
  for(var idx in classesObject){
    var theClass = classesObject[idx];
    classes[theClass.cid] = theClass; 
  }
  storage.setItem(getUsername() + ":" + profName + ":Classes",JSON.stringify(classes));
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
  var quizzes = new Object();
  for(var idx in quizzesObject){
    var quiz = quizzesObject[idx];
    quizzes[quiz.qid] = quiz; 
  }
  storage.setItem(getUsername() + ":" + cid + ":Quizzes",JSON.stringify(quizzes));
}

getQuizzes = function(cid){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":" + cid + ":Quizzes"));
}

setModules = function(cid,modulesObject){
  var storage = window.localStorage;
  var modules = new Object();
  for(var idx in modulesObject){
    var module = modulesObject[idx];
    modules[module.mid] = module; 
  }
  storage.setItem(getUsername() + ":" + cid + ":Modules",JSON.stringify(modules));
}

getModules = function(cid){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + ":" + cid + ":Modules"));
}

downloadQuizzesAndModules = function(cid,callback){
  var url = baseUrl + "/mobile/quizzes?cid=" + encodeURIComponent(cid) + "&user=" + encodeURIComponent(encrypt(getUsername()));
  console.log("GET:" + url);
  $.ajax({
    url:url,
    async:false,
    success:function(data){
      callback(data['quizzes'],data['modules']);
    },
    error:function(){
      callback(null,"Problem Downloading Quizzes");
    }
  });
  
}

setQuiz = function(qid,quizObject){
  var storage = window.localStorage;
  console.log(quizObject);
  var answers = new Object();
  var questions = new Object();
  for(var idx in quizObject.answers){
    var answer = quizObject.answers[idx];
    answers[answer.questid] = answer;
  }
  for(var idx in quizObject.questions){
    var question = quizObject.questions[idx];
    questions[question.questid] = question;
  }
  quizObject.answers = answers;
  quizObject.questions = questions;
  console.log(JSON.stringify(quizObject,null,2));
  storage.setItem(getUsername() + ":Quiz:" + qid,JSON.stringify(quizObject));
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

getQuizQuestions = function(quiz){
  var questions = new Object();
  questions.easy = new Object();
  questions.medium  = new Object();
  questions.hard = new Object();
  for(var idx in quiz.questions){
    var question = quiz.questions[idx];
    if(typeof(quiz.answers[question.questid]) == "undefined"){
      if(question.difficulty == 1){
        questions.easy[question.cid] = question;
      }else if(question.difficulty == 2){
        questions.medium[question.cid] = question;
      }else{
        questions.hard[question.cid] = question;
      }
    }
  }
  return questions;
}

setAnswer = function(qid,questid,answer,correct){
  var now = new Date().getTime() / 1000;
  var quiz = getQuiz(qid);
  quiz.answers[questid] = new Object();
  quiz.answers[questid]["saved_answer"] = answer;
  quiz.answers[questid]["questid"] = questid;
  timeSpent =  Math.round((new Date().getTime() / 1000) - quiz["start-time"]);
  quiz.answers[questid]["time_spent"] =timeSpent;
  var prevCorrect = quiz.prevCorrect;
  if(typeof(prevCorrect) != 'undefined' && prevCorrect != undefined && prevCorrect != correct){
    quiz.diffStep = Math.max(quiz.diffStep -2,2);
  }
  quiz.prevCorrect = correct;
  if(correct){
    quiz.currentDiff = Math.min(quiz.currentDiff + quiz.diffStep,90);

  }else{
    quiz.currentDiff = Math.max(quiz.currentDiff - quiz.diffStep,1);
  }
  var url = baseUrl + "/mobile/answer?username=" + encodeURIComponent(encrypt(getUsername())) +
    "&questid=" + encodeURIComponent(questid) + "&answer=" + encodeURIComponent(answer) + "&timespent=" + encodeURIComponent(timeSpent);
    console.log(url);
  pushUpdateQueue(url);
  setQuiz(qid,quiz);
  return quiz;
}

getUpdateQueue = function(){
  var storage = window.localStorage;
  return JSON.parse(storage.getItem(getUsername() + "updateQ"));
}

pushUpdateQueue = function(update){
  var storage = window.localStorage;
  var queueString = storage.getItem(getUsername() + "updateQ");
  var queue;
  if(queueString == null){
    queue = new Array();
  }else{
    queue = JSON.parse(queueString);
  }
  queue.push(update);
  storage.setItem(getUsername() + "updateQ",JSON.stringify(queue));
  runUpdateQueue();
}

popUpdateQueue = function(){
  var queue = getUpdateQueue();
  var update = queue.pop();
  var storage = window.localStorage;
  storage.setItem(getUsername() + "updateQ",JSON.stringify(queue));
  return update;
}

runUpdateQueue = function(){
  var queue = getUpdateQueue();
  console.log(JSON.stringify(queue,null,2));
  if(queue.length > 0){
    var update = queue[queue.length - 1];
    console.log(update);
    $.ajax({
      url:update,
      success:function(data){
        console.log('successful update');
        var updatedQ = popUpdateQueue();
        runUpdateQueue();
      },
      error:function(){
        console.log("Problem with update");
      }
    });
  }
  
}

function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}


