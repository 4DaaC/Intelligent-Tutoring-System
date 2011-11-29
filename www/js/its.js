getUsername = function(){
  var storage = window.localStorage;
  return storage.getItem("ITS-Username");
}

setUsername = function(username){
  var storage = window.localStorage;
  storage.setItem("ITS-Username",username);
}

loggedIn = function(){
  return getUsername() != null;
}

logoutUser = function(){
  window.localStorage.removeItem('ITS-Username');
}

goBack = function(){
  history.go(-1);
}

getClasses = function(username){
  return new Array();
}