
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
		x.loadTimeline(function(data){
			res.json(data);
		});
	});

};

// prints json array of mentions
exports.mentions = function(req, res){
	var twitterAccountId = req.session.currentAccount;

	x.setUser(req.session.user);
	x.setCurrentAccount(twitterAccountId, function(data){
		x.loadMentions(function(data){
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