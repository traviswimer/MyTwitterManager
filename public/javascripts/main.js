$(function(){
//////////////////////
// Swiping features //
/////////////////////////////////////////////////////////////////////
//                                                                 //

	// Initialize swiping functionality
	window.Swiper = new Swipe(
		document.getElementById('main-section'),
		{
			startSlide: 0,
			speed: 400,
			continuous: true,
			disableScroll: false,
			stopPropagation: false,
			callback: function(index, elem){
				switch(elem.id){
					case "tweets":
						loadTimeline();
						break;
					case "mentions":
						loadMentions();
						break;
					case "favorites":
						loadFavorites();
						break;
					case "retweets":
						loadRetweets();
						break;
					case "followers":
						loadFollowers();
						break;
				}
			},
			transitionEnd: function(index, elem){
				var buttons = $('.button-icon');
				buttons.removeClass('selected');
				$(buttons[index]).addClass('selected');
			}
		}
	);


	// load default start slide
	loadTimeline(false, function(){
		loadAccountInfo();
	});

	loadAccounts();

	// initialize buttons
	$('#tweets-btn').parent().click(function(){
		transitionToSlide(0);
	});
	$('#mentions-btn').parent().click(function(){
		transitionToSlide(1);
	});
	$('#favorites-btn').parent().click(function(){
		transitionToSlide(2);
	});
	$('#retweets-btn').parent().click(function(){
		transitionToSlide(3);
	});
	$('#followers-btn').parent().click(function(){
		transitionToSlide(4);
	});

	// Forces swipe. Updates selected button
	function transitionToSlide(index){
		Swiper.slide(index, 400);
	}

	// close authentication overlay
	$('#close-overlay').click(function(){
		$('#auth-overlay').hide();
	});

	// close reply overlay
	$('#close-reply-overlay').click(function(){
		$('#reply-overlay').hide();
		document.getElementById('is-reply-to').value = "0";
		document.getElementById('reply-input').value = "";
	});

	// Post a tweet
	document.getElementById('tweet-writer').onsubmit = function(e){
		var status = $('#tweet-input').val();
		$('#tweet-input').attr("disabled", "disabled");
		$('#tweet-submit').val('Posting...').attr("disabled", "disabled");

		$.get('./ajax/postTweet', {status: status, isReplyTo: false}, function(data){
			if(data && data.success){
				$('#tweet-input').val("").removeAttr("disabled");
				$('#tweet-submit').val('Posted!').removeAttr("disabled");
			}else{
				alert(data.error);
			}
			$('#tweet-input').removeAttr("disabled");
			$('#tweet-submit').removeAttr("disabled");
			setTimeout(function(){
				$('#tweet-submit').val('Post');
			}, 1000);
		}, 'json');

		if(e){
			e.returnValue = false;
		}
		return false;
	};

	// Post a reply
	document.getElementById('reply-writer').onsubmit = function(e){
		var status = $('#reply-input').val();
		$('#reply-input').attr("disabled", "disabled");
		$('#reply-submit').val('Posting...').attr("disabled", "disabled");
		var isReplyTo = $('#is-reply-to').val();

		$.get('./ajax/postTweet', {status: status, isReplyTo: isReplyTo}, function(data){
			if(data && data.success){
				$('#reply-input').val("").removeAttr("disabled");
				$('#reply-submit').val('Posted!').removeAttr("disabled");
			}else{
				alert(data.error);
			}
			$('#reply-input').removeAttr("disabled");
			$('#reply-submit').removeAttr("disabled");
			setTimeout(function(){
				$('#reply-submit').val('Post');
			}, 1000);
		}, 'json');

		if(e){
			e.returnValue = false;
		}

		return false;
	};


	// move cursor to end of textarea on focus
	document.getElementById('tweet-input').addEventListener('focus', function(){
		moveCurosrToEnd(this);
	});
	document.getElementById('reply-input').addEventListener('focus', function(){
		moveCurosrToEnd(this);
	});

	// Puts a cursor at the end of the text in a textarea
	function moveCurosrToEnd(el){
		if (typeof el.selectionStart == "number") {
			el.selectionStart = el.selectionEnd = el.value.length;
		} else if (typeof el.createTextRange != "undefined") {
			el.focus();
			var range = el.createTextRange();
			range.collapse(false);
			range.select();
		}
	}

//                                                                 //
/////////////////////////////////////////////////////////////////////


///////////////////
// Slide Loaders //
/////////////////////////////////////////////////////////////////////
//                                                                 //

	// Appends a list of tweets to a the specified DOM node
	function appendTweetList(containerNode, data){
		if(data && data.length){
			var mentionsFragment = document.createDocumentFragment();
			for(var i=0; i<data.length; i++){

				// Create a unique scope for each tweet
				(function(tweetInfo){
					// Tweet container
					var theTweet = document.createElement('div');
					theTweet.className = "tweet-item";

					// tweet image
					var tweetImg = document.createElement('img');
					tweetImg.className = "user-image";
					tweetImg.src = tweetInfo.profile_image_url;

					// tweet text content
					var tweetText = document.createElement('div');
					tweetText.className = "tweet";
					tweetText.innerHTML = tweetInfo.text;


					// tweet options
					var tweetOptions = document.createElement('div');
					tweetOptions.className = "tweet-options";

					// - option: reply
					var replyOption = document.createElement('div');
					replyOption.className = "tweet-option reply-option";
					replyOption.addEventListener("click", function(){
						$('#reply-overlay').show();
						document.getElementById('is-reply-to').value = tweetInfo.tweet_id;
						document.getElementById('reply-input').value += '@'+tweetInfo.username+" ";
						document.getElementById('reply-input').focus();
					});
					tweetOptions.appendChild(replyOption);

					// - option: retweet
					var hasRetweeted = tweetInfo.retweeted ? " selected" : "";
					var retweetOption = document.createElement('div');
					var retweetedStatusId;
					retweetOption.className = "tweet-option retweet-option"+hasRetweeted;
					retweetOption.addEventListener("click", function(){
						var rtID = retweetedStatusId ? retweetedStatusId : tweetInfo.tweet_id;

						toggleRetweet(rtID, tweetInfo.retweeted, function(data){
							if(data.success){
								if(tweetInfo.retweeted){
									$(retweetOption).removeClass('selected');
									tweetInfo.retweeted = false;
									retweetedStatusId = undefined;
								}else{
									$(retweetOption).addClass('selected');
									tweetInfo.retweeted = true;
									retweetedStatusId = data.statusId;
								}
							}
						});
					});
					tweetOptions.appendChild(retweetOption);

					// - option: favorite
					var hasFavorited = tweetInfo.favorited ? " selected" : "";
					var favoriteOption = document.createElement('div');
					favoriteOption.className = "tweet-option favorite-option"+hasFavorited;
					favoriteOption.addEventListener("click", function(){
						toggleFavorite(tweetInfo.tweet_id, tweetInfo.favorited, function(){
							if(tweetInfo.favorited){
								$(favoriteOption).removeClass('selected');
								tweetInfo.favorited = false;
							}else{
								$(favoriteOption).addClass('selected');
								tweetInfo.favorited = true;
							}
						});
					});
					tweetOptions.appendChild(favoriteOption);

					// - option: follow
					var hasFollowed = tweetInfo.is_following ? " selected" : "";
					var followOption = document.createElement('div');
					followOption.className = "tweet-option follow-option"+hasFollowed;
					followOption.addEventListener("click", function(){
						toggleFollow(tweetInfo.username, tweetInfo.is_following, function(){
							if(tweetInfo.is_following){
								$(followOption).removeClass('selected');
								tweetInfo.is_following = false;
							}else{
								$(followOption).addClass('selected');
								tweetInfo.is_following = true;
							}
						});
					});
					tweetOptions.appendChild(followOption);




					theTweet.appendChild(tweetImg);
					theTweet.appendChild(tweetText);
					theTweet.appendChild(tweetOptions);

					$(theTweet).click(function(e){
						if(e && e.target !== tweetOptions && e.target.parentNode !== tweetOptions){
							$(tweetOptions).toggle();
						}
					});

					mentionsFragment.appendChild(theTweet);
				}(data[i]));

			}
			containerNode.children[0].innerHTML = "";
			containerNode.children[0].appendChild(mentionsFragment);

		}
	}


	// Appends a list of users to a the specified DOM node
	function appendUserList(containerNode, data){
		if(data && data.length){
			var usersFragment = document.createDocumentFragment();
			for(var i=0; i<data.length; i++){

				// Create a unique scope for each user
				// Variables say 'tweet' a lot, but that's just because I'm lazy
				(function(){
					// Tweet container
					var theTweet = document.createElement('div');
					theTweet.className = "tweet-item";

					// tweet image
					var tweetImg = document.createElement('img');
					tweetImg.className = "user-image";
					tweetImg.src = data[i].profile_image_url;

					// tweet text content
					var tweetText = document.createElement('div');
					tweetText.className = "tweet";
					tweetText.innerHTML = data[i].screen_name+" - "+data[i].description;


					// tweet options
					var tweetOptions = document.createElement('div');
					tweetOptions.className = "tweet-options";

					// - option: follow
					var hasFollowed = data[i].is_following ? " selected" : "";
					var followOption = document.createElement('div');
					followOption.className = "tweet-option follow-option"+hasFollowed;
					tweetOptions.appendChild(followOption);




					theTweet.appendChild(tweetImg);
					theTweet.appendChild(tweetText);
					theTweet.appendChild(tweetOptions);

					$(theTweet).click(function(){
						$(tweetOptions).toggle();
					});

					usersFragment.appendChild(theTweet);
				}());

			}
			containerNode.children[0].innerHTML = "";
			containerNode.children[0].appendChild(usersFragment);

		}
	}

	// Loads list of user's accounts
	function loadAccounts(callback){
		$.get('./ajax/load_accounts', {}, function(accountsArray){
			var accountList = document.getElementById('account-list');
			accountList.innerHTML = "";

			var fragment = document.createDocumentFragment();

			for(var i=0; i<accountsArray.length; i++){
				(function(){
					var accountId = accountsArray[i].id;
					var newDiv = document.createElement('div');
					newDiv.className = "account-item";
					newDiv.id = "account-item-"+accountId;

					var newImg = document.createElement('img');
					newImg.src = accountsArray[i].image_url;

					var acctName = document.createElement('span');
					acctName.innerHTML = "@"+accountsArray[i].screen_name;
					acctName.addEventListener("click", function(){
						// clear last account's data
						document.querySelector('#tweets .content').innerHTML = "Loading...";
						document.querySelector('#mentions .content').innerHTML = "Loading...";
						document.querySelector('#favorites .content').innerHTML = "Loading...";
						document.querySelector('#retweets .content').innerHTML = "Loading...";
						document.querySelector('#followers .content').innerHTML = "Loading...";

						// Load data
						loadTimeline(accountId, function(){
							loadAccountInfo(accountId);
							transitionToSlide(0);
						});
					});

					var acctDeleter = document.createElement('img');
					acctDeleter.src = "images/delete.png";
					acctDeleter.className = "delete-btn";
					acctDeleter.addEventListener("click",function(){
						var confirmDelete = confirm('Are you sure you want to permanently delete this account?');
						
						if(confirmDelete){
							deleteAccount(accountId);
						}
					});

					newDiv.appendChild(newImg);
					newDiv.appendChild(acctName);
					newDiv.appendChild(acctDeleter);

					fragment.appendChild(newDiv);
				}());

			}
			accountList.appendChild(fragment);

			// Toggle account list
			$('.inner-account-btn').click(function(){
				if( $('#bottom-menu').css("height") === "30px" ){
					$('#bottom-menu').animate({
						"height": "50%"
					}, 400);
				}else{
					$('#bottom-menu').animate({
						"height": "30px"
					}, 400);
				}
			});

			if(callback){ callback(); }
		},'json');
	}

	// Loads account info
	function loadAccountInfo(acctId){
		$.get('./ajax/account', {acctId: acctId}, function(data){
			var accountName = document.getElementById('account-name');
			accountName.children[0].src = data.picture;
			accountName.children[1].innerHTML = data.screenName;
		},'json');
	}

	// Loads timeline
	function loadTimeline(acctId, callback){
		$.get('./ajax/timeline', {acctId: acctId}, function(data){
			var timelineContainer = document.getElementById('tweets');
			appendTweetList(timelineContainer, data);
			if(callback){ callback(); }
		},'json');
	}

	// Loads mentions
	function loadMentions(){
		$.get('./ajax/mentions', {}, function(data){
			var mentionsContainer = document.getElementById('mentions');
			appendTweetList(mentionsContainer, data);
		},'json');
	}

	// Loads favorites
	function loadFavorites(){
		$.get('./ajax/favorites', {}, function(data){
			var favoritesContainer = document.getElementById('favorites');
			appendTweetList(favoritesContainer, data);
		},'json');
	}

	// Loads retweets
	function loadRetweets(){
		$.get('./ajax/retweets', {}, function(data){
			var retweetsContainer = document.getElementById('retweets');
			appendTweetList(retweetsContainer, data);
		},'json');
	}

	// Loads followers
	function loadFollowers(){
		$.get('./ajax/followers', {}, function(data){
			var followersContainer = document.getElementById('followers');
			appendUserList(followersContainer, data);
		},'json');
	}

	// Posts a Tweet
	function postTweet(tweetText, isReplyTo, callback){
		$.get('./ajax/postTweet', {status: tweetText, isReplyTo: isReplyTo}, callback, 'json');
	}

	// Favorites/unfavorites a Tweet
	function toggleFavorite(tweetId, unfavorite, callback){
		$.get('./ajax/makeFavorite', {tweetId: tweetId, unfavorite: unfavorite}, callback, 'json');
	}

	// retweets/unretweets a Tweet
	function toggleRetweet(tweetId, unretweet, callback){
		$.get('./ajax/makeRetweet', {tweetId: tweetId, unretweet: unretweet}, callback, 'json');
	}

	// follows/unfollows a user
	function toggleFollow(username, unfollow, callback){
		$.get('./ajax/follow', {username: username, unfollow: unfollow}, callback, 'json');
	}



	// deletes an account
	function deleteAccount(accountId){

		$.get('./ajax/remove_account', {"acctId": accountId}, function(data){
			if(data && data.success){
				$('#account-item-'+accountId).remove();
			}
		},'json');
	}

//                                                                 //
/////////////////////////////////////////////////////////////////////


////////////////////////////////////
// Twitter Account Authentication //
/////////////////////////////////////////////////////////////////////
//                                                                 //

	$('#add-account-btn').click(function(){
		authenticateAccount();
	});

	function authenticateAccount(){
		$.get('./ajax/oauth', {}, function(data){
			$('#auth-overlay').show();
			if(data && data.oauth_token){
				var theLink = document.createElement("a");
				theLink.href = 'https://twitter.com/oauth/authenticate?oauth_token='+data.oauth_token;
				theLink.innerHTML = 'Authenticate with Twitter';
				document.getElementById('auth-box').innerHTML = '';
				document.getElementById('auth-box').appendChild(theLink);
			}else{
				console.log("Invalid token");
			}
		},'json');
	}

//                                                                 //
/////////////////////////////////////////////////////////////////////
});
