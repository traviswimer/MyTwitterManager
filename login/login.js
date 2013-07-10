var mongo = require('mongoskin');
var crypto = require('crypto');

var database = require('../database');

var login = function(){

	// Authenticate a user
	function authenticate(req, res, fallbackRoute){
		database.getModels(authUser);
		function authUser(models){
			var username = req.body.username;
			var password = crypto.createHash('sha512').update(req.body.password).digest("hex");

			models.User.find({
				username:username,
				password:password
			}, function (err, items) {
				console.dir(items);
				if(!err && items.length > 0){
					req.session.user = items[0]._id;
					console.log(req.session.user);
					res.redirect('/app');
				}else{
					fallbackRoute(req, res);
				}
			});
		}
	}

	// register a new user account
	function register(req, res, fallbackRoute){
		database.getModels(function(models){
			var username = req.body.username;
			var password = crypto.createHash('sha512').update(req.body.password).digest("hex");

			var newUser = new models.User({username:username,password:password});
			newUser.save();

			authenticate(req, res, fallbackRoute);
		});
	}

	return {
		authenticate: authenticate,
		register: register
	};
}();

module.exports = login;