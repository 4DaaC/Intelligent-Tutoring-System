CREATE TABLE Auth_Level(
  type VARCHAR(20) NOT NULL
);

CREATE TABLE Users (
  uid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(30) NOT NULL,
  auth_level VARCHAR(20) NOT NULL,
  FOREIGN KEY (auth_level) REFERENCES auth_level(type)       
);

CREATE TABLE Classes(
  cid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uid INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  classlimit INT,
  privacy BOOL NOT NULL,
  FOREIGN KEY (uid) REFERENCES Users(uid)
);

CREATE TABLE Class_List(
  cid INT NOT NULL,
  uid INT NOT NULL,
  PRIMARY KEY (cid,uid),
  FOREIGN KEY (uid) REFERENCES Users(uid),
  FOREIGN KEY (cid) REFERENCES Classes(cid)
);

CREATE TABLE Question_Types (
	name VARCHAR(100) NOT NULL
);

CREATE TABLE Questions (
	questid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	qid INT NOT NULL,
	question TEXT NOT NULL,
	type VARCHAR(100) NOT NULL,
	answers TEXT NOT NULL,
	correct_answer TEXT NOT NULL,
	FOREIGN KEY (qid) REFERENCES Quizzes(qid),
	FOREIGN KEY (type) REFERENCES Question_Types(name)
);

CREATE TABLE Quizzes (
	qid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	cid INT NOT NULL,
	name VARCHAR(100) NOT NULL,
	FOREIGN KEY (cid) REFERENCES Classes(cid)
);

CREATE TABLE Questions_List(
  questid INT NOT NULL,
  qid INT NOT NULL,
  PRIMARY KEY (questid, qid),
  FOREIGN KEY (questid) REFERENCES Questions (questid),
  FOREIGN KEY (qid) REFERENCES Quizzes (qid)
);

CREATE TABLE Answers (
	uid INT NOT NULL,
	questid INT NOT NULL,
	saved_answer TEXT,
	primary key (uid, questid),
	FOREIGN KEY (questid) REFERENCES Questions(questid)
);
 
CREATE TABLE Grades (
	uid INT NOT NULL,
	qid INT NOT NULL,
	grade INT,
	primary key (uid, qid),
	FOREIGN KEY (uid) REFERENCES Users(uid),
	FOREIGN KEY (qid) REFERENCES Quizzes(qid)
);
