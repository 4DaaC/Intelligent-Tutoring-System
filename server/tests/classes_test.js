var classes = require('../classes');
var assert = require('assert');

function REQ(requser, reqbody, reqquery) {
this.query = reqquery;
this.body = reqbody;
this.flash = function(str, err) {
};
this.session = {
	user:{
		auth: requser.auth,
		username: requser.username
	}
}
};

function RES(redirect, render) {
this.redirect = redirect;
this.render = render;
};

module.exports = {

	'addClassForm#admin': function(done) {
		var req = new REQ({auth: 2, username:'jdominic'},{},{});
		var res = new RES(function(str) {
			classes.disconnect();
			assert.ok(false);
		}, function(str, params) {
			classes.disconnect();
			assert.eql(str, 'add_class');
		});
		classes.addClassForm(req, res);
	},
	'addClassForm#professor': function(done) {
		var req = new REQ({auth: 1, username:'jdominic'},{},{});
		var res = new RES(function(str) {
			classes.disconnect();
			assert.ok(false);
		}, function(str, params) {
			classes.disconnect();
			assert.eql(str, 'add_class');
		});
		classes.addClassForm(req, res);
	},
	'addClassForm#student': function(done) {
		var req = new REQ({auth: 0, username:'jdominic'},{},{});
		var res = new RES(function(str) {
			classes.disconnect();
			assert.ok(true);
		}, function(str, params) {
			classes.disconnect();
			assert.ok(false);
		});
		classes.addClassForm(req, res);
	},
	'addClassSubmit': function() {
	},
	'editClassForm': function() {
	},
	'editClassSubmit': function() {
	},
	'removeStudentSubmit': function() {
	},
	'removeClassSubmit': function() {
	},
	'addStudentToClassSubmit': function() {
	},
	'addStudentToClassForm': function() {
	},
	'viewClasses': function() {
	},
	'viewClass': function() {
	},
	'validateAddClass': function() {
	},
	'validateRemoveStudent': function() {
	},
	'validateRemoveClass': function() {
	},
	'validateAddStudent': function() {
	},
	
};
