
var twitter = require('twit');
var database = require('./database');

module.exports = (function(){

///////////////////////
// Private Variables //
/*****************************************************************************/

	// Hold the current account's information
	var accountInfo = {};

	// The logged in user's ID
	var userId;
	var currentTwitterAccountId;
	var currentTwitterAccount;

	// App auth info
	var CONSUMER_KEY = 'xxxxxxxxxxxxxxxxxxxxx';
	var CONSUMER_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/*____________________________________________________________________________*/






/////////////////////
// Private Methods //
/*****************************************************************************/

	// Create the object for interacting with twitter
	function getTwitterAccess(authInfo){
		return new twitter(authInfo);
	}


	// makes API request to twitter for timeline
	function loadTimelineFromTwitter(models, lastTweetId, callback){
		var requestParams = {};
		if(lastTweetId){
			requestParams.since_id = lastTweetId;
		}
		currentTwitterAccount.get('statuses/home_timeline', requestParams, function(err, reply){
			var tweetInfo = [];
			tweets = reply || false;

			for(var i=0; i<tweets.length; i++){
				var tweetToAdd = {};

				var tempTweet;

				// check if this is a retweet
				if(tweets[i].retweeted_status){
					tempTweet = tweets[i].retweeted_status;
				}else{
					tempTweet = tweets[i];
				}

				// add tweet ID
				tweetToAdd.tweet_id = tempTweet.id;

				// create links in tweet
				tweetToAdd.text = convertTweetLinks(tempTweet.text);

				// add timestamp
				tweetToAdd.timestamp = convertTwitterDateToTimestamp(tempTweet.created_at);

				// add user pic
				tweetToAdd.profile_image_url = tempTweet.user.profile_image_url;

				// add to array
				tweetInfo.push(tweetToAdd);
				//console.dir(tweetToAdd);

				// add to database
				models.User.update(
					{
						_id: userId,
						'accounts._id': currentTwitterAccountId
					},
					{
						$addToSet: {
							'accounts.$.tweets': tweetToAdd
						}
					},
					function(error, result){
						if(error){
							console.log("err adding tweets: "+error);
						}else{
							// tweet added
						}
					}
				);
			}


			callback(tweetInfo);
		});
	}



	// Requests mentions from twitter
	function loadMentionsFromTwitter(models, lastTweetId, callback){
		var requestParams = {};
		if(lastTweetId){
			requestParams.since_id = lastTweetId;
		}
		currentTwitterAccount.get('statuses/mentions_timeline', requestParams, function(err, reply) {
			var tweetInfo = [];
			tweets = reply || false;

			for(var i=0; i<tweets.length; i++){
				var tweetToAdd = {};
				var theTweet = tweets[i];

				// add tweet ID
				tweetToAdd.tweet_id = theTweet.id;

				// create links in tweet
				tweetToAdd.text = convertTweetLinks(theTweet.text);

				// add timestamp
				tweetToAdd.timestamp = convertTwitterDateToTimestamp(theTweet.created_at);

				// add user pic
				tweetToAdd.profile_image_url = theTweet.user.profile_image_url;

				// add to array
				tweetInfo.push(tweetToAdd);


				// add to database
				models.User.update(
					{
						_id: userId,
						'accounts._id': currentTwitterAccountId
					},
					{
						$addToSet: {
							'accounts.$.mentions': tweetToAdd
						}
					},
					function(error, result){
						if(error){
							console.log("err adding tweets: "+error);
						}else{
							// tweet added
						}
					}
				);
			}

			callback(tweetInfo);
		});
	}



	// Converts URLs, @mentions, and #hashtags to hyperlinks
	function convertTweetLinks(text){
		var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
		text = text.replace(exp, "<a href='$1' target='_blank'>$1</a>");
		exp = /(^|\s)#(\w+)/g;
		text = text.replace(exp, "$1<a href='http://search.twitter.com/search?q=%23$2' target='_blank'>#$2</a>");
		exp = /(^|\s)@(\w+)/g;
		text = text.replace(exp, "$1<a href='http://www.twitter.com/$2' target='_blank'>@$2</a>");
		return text;
	}


	// Converts the format of twitter's "created_at" to a timestamp
	function convertTwitterDateToTimestamp(twitterDate){
		return new Date(Date.parse(twitterDate.replace(/( \+)/, ' UTC$1'))).getTime();
	}

/*____________________________________________________________________________*/






////////////////////
// Public Methods //
/*****************************************************************************/

	// Sets the ID of the user
	function setUser(id){
		userId = id;
	}

	// Sets the current twitter account
	function setCurrentAccount(accountId, callback){
		database.getModels(function(models){
			// use default account if none specified 
			var query;
			var fields = {};
			if(accountId){
				query = {
					_id: userId,
					'accounts._id': accountId
				};

				fields = {
					accounts: {
						$elemMatch: {
							_id: accountId
						}
					}
				};
			}else{
				query = {
					_id: userId
				};
			}


			// find the account
			models.User.find(
				query,
				fields,
				function(err, items){
					if(!err && items.length > 0 && items[0].accounts[0]){
						var theAccount = items[0].accounts[0];

						currentTwitterAccount = getTwitterAccess({
							consumer_key: CONSUMER_KEY,
							consumer_secret: CONSUMER_SECRET,
							access_token: theAccount.access_token,
							access_token_secret: theAccount.access_token_secret
						});

						currentTwitterAccountId = theAccount._id;

						callback(theAccount._id);
					}
				}
			);


		});
	}



	// Retrieves a list of the user's accounts
	function getAccounts(callback){
		database.getModels(function(models){
			models.User.find(
				{
					_id: userId
				},
				function(err, users){
					if(!err && users.length > 0){
						var theAccounts = users[0].accounts;

						var accountsArray = [];
						for(var i=0; i<theAccounts.length; i++){

							var accountInfo = {
								id: theAccounts[i]._id,
								screen_name: theAccounts[i].screen_name,
								image_url: theAccounts[i].image_url
							};
							accountsArray.push(accountInfo);

						}

						callback(accountsArray);
					}
				}
			);
		});

	}


	// Retrieves the account information for the authenticated user
	function getAccountInfo(callback){

		// Make request to twitter
		currentTwitterAccount.get('account/verify_credentials', {}, function(err, reply) {

			var userInfo = reply || false;

			if(userInfo){
				accountInfo.screenName = userInfo.screen_name;
				accountInfo.picture = userInfo.profile_image_url;
			}
			callback(accountInfo);
		});
	}


	// Retrieves the authenticated user's timeline( array of tweet objects )
	function loadTimeline(callback){

		database.getModels(function(models){
			models.User.find(
				{
					_id: userId,
					'accounts._id': currentTwitterAccountId
				}
			).sort(
				{
					"accounts.tweets.tweet_id": -1
				}
			).exec(
				function(err, items){
					var tweets = items[0].accounts[0].tweets;
					if(!err && tweets && tweets.length > 0){
						loadTimelineFromTwitter(models, tweets[0].tweet_id, function(newTweetArray){
							// Combine array of previous and new tweets
							var returnArray = newTweetArray.concat(tweets);
							callback(returnArray);
						});
					}else{
						loadTimelineFromTwitter(models, false, callback);
					}
				}
			);
		});

	}


	// Retrieves the authenticated user's mentions( array of tweet objects )
	function loadMentions(callback){

		database.getModels(function(models){

			models.User.find(
				{
					_id: userId,
					'accounts._id': currentTwitterAccountId
				},
				{
					accounts: {
						$elemMatch: {
							_id: currentTwitterAccountId
						}
					}
				}
			).sort(
				{
					"accounts.mentions.tweet_id": -1
				}
			).exec(
				function(err, items){
					var mentions = items[0].accounts[0].mentions;
					if(!err && mentions && mentions.length > 0){
						loadMentionsFromTwitter(models, mentions[0].tweet_id, function(newTweetArray){
							// Combine array of previous and new mentions
							var returnArray = newTweetArray.concat(mentions);
							callback(returnArray);
						});
					}else{
						loadMentionsFromTwitter(models, false, callback);
					}
				}
			);


		});
	}


	// adds a new Twitter account
	function addAccount(accountInfo, callback){


		currentTwitterAccount = getTwitterAccess({
			consumer_key: CONSUMER_KEY,
			consumer_secret: CONSUMER_SECRET,
			access_token: accountInfo.oauth_access_token,
			access_token_secret: accountInfo.oauth_access_token_secret
		});

		//get account info from Twitter
		getAccountInfo(function(twitterData){


			var newAccount = {
				access_token: accountInfo.oauth_access_token,
				access_token_secret: accountInfo.oauth_access_token_secret,
				screen_name: twitterData.screenName,
				image_url: twitterData.picture
			};


			// add data to database
			database.getModels(function(models){
				models.User.update(
					{
						_id: userId
					},
					{
						$addToSet: {
							'accounts': newAccount
						}
					},
					function(error, result){
						if(error){
							console.log("error adding account: "+error);
						}else{
							callback();
						}
					}
				);
			});

		});

	}



	// removes a new Twitter account
	function removeAccount(accountId, callback){
		// delete document from database
		database.getModels(function(models){
			models.User.findOneAndUpdate(
				{
					_id: userId
				},
				{
					$pull: {
						"accounts": {
							"_id": accountId
						}
					}
				},
				function(err, doc){
					callback();
				}
			);
		});
	}


/*____________________________________________________________________________*/


	// Return public methods
	return {
		setUser: setUser,
		setCurrentAccount: setCurrentAccount,
		getAccounts: getAccounts,
		getAccountInfo: getAccountInfo,
		loadTimeline: loadTimeline,
		loadMentions: loadMentions,
		addAccount: addAccount,
		removeAccount: removeAccount
	};

}());

