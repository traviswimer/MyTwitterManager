
/*
 * GET home page.
 */

var database = require('../database');

exports.index = function(req, res){

	if(req.session.user){
		res.redirect('/app');
		return;
	}

	var username = req.body.username || "";

	database.getModels(function(models){


		// Check if a login account has been created
		models.User.find(
			{},
			function(err, users){
				if(!err && users.length>0){

					// render login form
					res.render('index', {
						title: 'Twit Manager',
						username: username
					});

				}else{

					// render register form
					res.render('register', {
						title: 'Twit Manager',
						username: username
					});

				}
			}
		);

	});



};