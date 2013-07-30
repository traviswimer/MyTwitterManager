
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
	var CONSUMER_KEY = 'xxxxxxxxxxxxxxxxxxxxxx';
	var CONSUMER_SECRET = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/*____________________________________________________________________________*/






/////////////////////
// Private Methods //
/*****************************************************************************/

	// Create the object for interacting with twitter
	function getTwitterAccess(authInfo){
		return new twitter(authInfo);
	}


	// makes API request to twitter for timeline
	function loadFromTwitter(twitterRequest, subdocumentName, models, lastTweetId, callback){
		var requestParams = {};
		if(lastTweetId){
			requestParams.since_id = lastTweetId;
		}
		currentTwitterAccount.get(twitterRequest, requestParams, function(err, reply){
			var tweetInfo = [];
			var tweets = reply || false;

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
				tweetToAdd.tweet_id = tempTweet.id_str;
				// create links in tweet
				tweetToAdd.text = convertTweetLinks(tempTweet.text);
				// add timestamp
				tweetToAdd.timestamp = convertTwitterDateToTimestamp(tempTweet.created_at);
				// add user pic
				tweetToAdd.profile_image_url = tempTweet.user.profile_image_url;
				// add boolean if user is following this user
				tweetToAdd.username = tempTweet.user.screen_name;
				// add boolean if user is following this user
				tweetToAdd.is_following = tempTweet.user.following;
				// add boolean if user has favorited the tweet
				tweetToAdd.favorited = tempTweet.favorited;
				// add boolean if user has retweeted the tweet
				tweetToAdd.retweeted = tempTweet.retweeted;

				// add to array
				tweetInfo.push(tweetToAdd);

				var setAdder = {};
				setAdder['accounts.$.'+subdocumentName] = tweetToAdd;

				// add to database
				models.User.update(
					{
						_id: userId,
						'accounts._id': currentTwitterAccountId
					},
					{
						$addToSet: setAdder
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


	// Obtains tweets from a document
	function getTweetsFromDatabase(documentName, callback){
		database.getModels(function(models){
			models[documentName].find(
				{
					_id: userId,
					'accounts._id': currentTwitterAccountId
				}
			).sort(
				{
					"accounts.tweets.tweet_id": -1
				}
			).limit(
				20
			).exec(
				function(err, items){
					var tweets = items[0].accounts[0].tweets;
					if(!err && tweets && tweets.length > 0){
						loadTimelineFromTwitter(models, tweets[0].tweet_id, function(newTweetArray){
							var returnArray = newTweetArray;

							// Combine array of previous and new tweets if necessary
							if(newTweetArray.length < 20){
								var numOldTweetsNeeded = 20 - newTweetArray.length;
								var slicedTweets = tweets.slice(0, numOldTweetsNeeded);
								returnArray = newTweetArray.concat(slicedTweets);
							}

							callback(returnArray);
						});
					}else{
						loadTimelineFromTwitter(models, false, callback);
					}
				}
			);
		});
	}


	// Combines cached tweets with tweets loaded from twitter
	function combineNewAndOldTweets(newTweets, oldTweets){
		var returnArray = newTweets;

		// Combine array of previous and new tweets if necessary
		if(newTweets.length < 20){
			var numOldTweetsNeeded = 20 - newTweets.length;
			var slicedTweets = oldTweets.slice(0, numOldTweetsNeeded);
			returnArray = newTweets.concat(slicedTweets);
		}

		return returnArray;
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




	// Retrieves the authenticated user's mentions( array of tweet objects )
	function loadTweets(action, subdocument, callback){

		database.getModels(function(models){

			var sortOptions = {};
			sortOptions["accounts."+subdocument+".tweet_id"] = -1;

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
				sortOptions
			).exec(
				function(err, items){
					var tweets = items[0].accounts[0][subdocument];
					if(!err && tweets && tweets.length > 0){
						loadFromTwitter(action, subdocument, models, tweets[0].tweet_id, function(newTweetArray){
							// Combine array of previous and new tweets
							var past20tweets = combineNewAndOldTweets(newTweetArray, tweets);

							callback(past20tweets);
						});
					}else{
						loadFromTwitter(action, subdocument, models, false, callback);
					}
				}
			);


		});
	}


	// loads current user's followers
	function loadUsers(action, callback){
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
			).exec(
				function(err, items){
					var userScreenName = items[0].accounts[0].screen_name;

					var requestParams = {};
					requestParams.screen_name = userScreenName;


					currentTwitterAccount.get(action, requestParams, function(err, reply){
						var usersInfo = [];
						var users = reply.users || false;

						for(var i=0; i<users.length; i++){
							var usersObj = {};
							usersObj.screen_name = users[i].screen_name;
							usersObj.profile_image_url = users[i].profile_image_url;
							usersObj.description = users[i].description;
							usersInfo.push(usersObj);
						}

						callback(usersInfo);
					});

				}
			);



		});
	}


	// posts a tweet for the current user
	function postTweet(status, isReplyTo, callback){

		if(status.length <= 140 && status.length > 0){
			var requestParams = {};
			requestParams.status = status;
			if(isReplyTo){
				requestParams.in_reply_to_status_id = isReplyTo;
			}

			var action = 'statuses/update';

			currentTwitterAccount.post(action, requestParams, function(err, reply){
				if(!err){
					callback({success: true});
				}else{
					callback({success: false, error: 'Error posting to Twitter'});
				}
			});

		}else{
			// return false if tweet is invalid
			callback({success: false, error: 'Invalid tweet'});
		}

	}


	// favorites/unfavorites a tweet
	function makeFavorite(tweetId, unfavorite, callback){

		if(tweetId){
			var requestParams = {};
			requestParams.id = tweetId;

			var action = 'favorites/create';
			if(unfavorite){
				action = 'favorites/destroy';
			}

			currentTwitterAccount.post(action, requestParams, function(err, reply){
				if(!err){
					callback({success: true});
				}else{
					callback({success: false, error: 'Twitter could not favorite this tweet'});
				}
			});

		}else{
			// return false if tweet is invalid
			callback({success: false, error: 'Invalid tweet ID'});
		}

	}


	// retweets/unretweets a tweet
	function makeRetweet(tweetId, unretweet, callback){

		if(tweetId){
			var requestParams = {};

			var action = 'statuses/retweet/'+tweetId;
			if(unretweet){
				action = 'statuses/destroy/'+tweetId;
			}

			currentTwitterAccount.post(action, requestParams, function(err, reply){
				if(!err){
					callback({success: true, statusId: reply.id_str});
				}else{
					callback({success: false, error: 'Twitter could not retweet this tweet'});
				}
			});

		}else{
			// return false if tweet is invalid
			callback({success: false, error: 'Invalid tweet ID'});
		}

	}


	// follows/unfollows a user
	function follow(username, unfollow, callback){

		if(username){
			var requestParams = {
				'screen_name': username
			};

			var action = 'friendships/create';
			if(unfollow){
				action = 'friendships/destroy';
			}

			currentTwitterAccount.post(action, requestParams, function(err, reply){
				if(!err){
					callback({success: true});
				}else{
					callback({success: false, error: 'Twitter could not follow this user'});
				}
			});

		}else{
			// return false if tweet is invalid
			callback({success: false, error: 'Invalid username'});
		}

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
		loadTweets: loadTweets,
		loadUsers: loadUsers,
		postTweet: postTweet,
		makeFavorite: makeFavorite,
		makeRetweet: makeRetweet,
		follow: follow,
		addAccount: addAccount,
		removeAccount: removeAccount
	};

}());

