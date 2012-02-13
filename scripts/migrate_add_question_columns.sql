alter table Questions add column category varchar (30) ; 
alter table Questions add column points int;
alter table Questions add column difficulty int;
alter table Quizzes add column question_amount int;
alter table Quizzes add column active BOOLEAN DEFAULT 0;