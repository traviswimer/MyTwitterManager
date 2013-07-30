
/*
 * return JSON for ajax requests
 */
var https = require("https");
var OAuth= require('oauth').OAuth;
var x = require('./../x');

// prints json array of accounts under the logged in user
exports.loadAccounts = function(req, res){
	x.setUser(req.session.user);
	x.getAccounts(function(data){
		res.json(data);
	});

};

// prints json for the specified account's info
exports.account = function(req, res){
	var twitterAccountId = req.body.acctId;
	if(req.query.acctId && req.query.acctId !== "false"){
		twitterAccountId = req.query.acctId;
	}

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(accountId){

		// set session for twitter account ID
		req.session.currentAccount = accountId;

		// Retrieve account info
		x.getAccountInfo(function(data){
			res.json(data);
		});
	});

};

// prints json array of tweets from accounts timeline
exports.timeline = function(req, res){
	var twitterAccountId = req.session.currentAccount;
	if(req.query.acctId && req.query.acctId !== "false"){
		twitterAccountId = req.query.acctId;
	}

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadTweets('statuses/home_timeline', 'tweets', function(data){
			res.json(data);
		});
	});

};

// prints json array of mentions
exports.mentions = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadTweets('statuses/mentions_timeline', 'mentions', function(data){
			res.json(data);
		});
	});
};

// prints json array of favorites
exports.favorites = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadTweets('favorites/list', 'favorites', function(data){
			res.json(data);
		});
	});
};

// prints json array of retweets
exports.retweets = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadTweets('statuses/retweets_of_me', 'retweets', function(data){
			res.json(data);
		});
	});
};

// prints json array of followers
exports.followers = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadUsers('followers/list', function(data){
			res.json(data);
		});
	});
};

// posts a tweet
exports.postTweet = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	var status = "";
	var isReplyTo = false;
	if(req.query.status){
		status = req.query.status;
	}
	if(req.query.isReplyTo && req.query.isReplyTo !== "0"){
		isReplyTo = req.query.isReplyTo;
	}

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.postTweet(status, isReplyTo, function(data){
			res.json(data);
		});
	});
};


// favorites/unfavorites a tweet
exports.makeFavorite = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	var tweetId = false;
	var unfavorite = false;
	if(req.query.tweetId){
		tweetId = req.query.tweetId;
	}
	if(req.query.unfavorite){
		unfavorite = req.query.unfavorite;
	}
	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.makeFavorite(tweetId, unfavorite, function(data){
			res.json(data);
		});
	});
};


// retweets/unretweets a tweet
exports.makeRetweet = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	var tweetId = false;
	var unretweet = false;
	if(req.query.tweetId){
		tweetId = req.query.tweetId;
	}
	if(req.query.unretweet){
		unretweet = req.query.unretweet;
	}
	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.makeRetweet(tweetId, unretweet, function(data){
			res.json(data);
		});
	});
};


// follow/unfollow a user
exports.follow = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	var username = false;
	var unfollow = false;
	if(req.query.username){
		username = req.query.username;
	}
	if(req.query.unfollow){
		unfollow = req.query.unfollow;
	}
	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.follow(username, unfollow, function(data){
			res.json(data);
		});
	});
};





exports.removeAccount = function(req, res){
	var twitterAccountId = req.query.acctId;

	x.removeAccount(twitterAccountId, function(){
		res.json({success: true});
	});
};



// Oauth functionality
/***********************************************************************/

var oa = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	"TWITTER_APP_TOKEN",
	"TWITTER_APP_TOKEN_SECRET",
	"1.0",
	"http://localhost:3000/oauthed",
	"HMAC-SHA1"
);


// Oauth functionality
exports.oauth = function(req, res){

	oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if(error){
			console.log(error);
			res.json({});
		}else{
			req.session.oauth = {};
			req.session.oauth.token = oauth_token;
			console.log('oauth.token: ' + req.session.oauth.token);
			req.session.oauth.token_secret = oauth_token_secret;
			console.log('oauth.token_secret: ' + req.session.oauth.token_secret);
			res.json({oauth_token: oauth_token});
		}
	});

};



// complete oauth request
exports.oauthed = function(req, res){

	if (req.session.oauth) {
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;

		oa.getOAuthAccessToken(
			oauth.token,
			oauth.token_secret,
			oauth.verifier,
			function(error, oauth_access_token, oauth_access_token_secret, results){
				if (error){
					console.log(error);
					res.send("Authentication Error");
				} else {

					// Add account to the database
					x.addAccount(
						{
							oauth_access_token: oauth_access_token,
							oauth_access_token_secret: oauth_access_token_secret
						},
						function(){
							res.redirect("/app");
						}
					);

				}
			}
		);
	}

};

/*_______________________________________________________________________*/
