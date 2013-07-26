

module.exports = (function(){
	var mongoose = require('mongoose');
	mongoose.connect('mongodb://localhost/test');

	var models;

	mongoose.connection.on('error', function(){
		console.log("database error");
		if(!models){
			models = {};
		}
	});

	mongoose.connection.once('open', function(){
		console.log("connected to database");
		models = {};

		// tweers document
		////////////////////////////////
		var tweets = mongoose.Schema({
			tweet_id: Number,
			timestamp: Number,
			profile_image_url: String,
			text: String,
			username: String,
			is_following: Boolean,
			favorited: Boolean,
			retweeted: Boolean
		});

		// accounts document
		////////////////////////////////
		var twitterAccounts = mongoose.Schema({
			screen_name: String,
			image_url: String,
			consumer_key: String,
			consumer_secret: String,
			access_token: String,
			access_token_secret: String,
			tweets: [tweets],
			mentions: [tweets],
			favorites: [tweets],
			retweets: [tweets]
		});

		// Users document
		////////////////////////////////
		var users = mongoose.Schema({
			username: String,
			password: String,
			accounts: [twitterAccounts]
		});
		models.User = mongoose.model('User', users);

	});


	function getModels(callback){
		if(models){
			callback(models);
		}else{
			setTimeout(function(){
				getModels(callback);
			}, 15);
		}
	}

	return {
		getModels: getModels
	};
}());