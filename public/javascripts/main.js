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
			callback: function(index, elem) {},
			transitionEnd: function(index, elem) {}
		}
	);

	// load default start slide
	loadTimeline(false, function(){
		loadAccountInfo();
	});

	loadAccounts();

	// initialize buttons
	$('#tweets-btn').parent().click(function(){
		loadTimeline();
		transitionToSlide(0);
	});
	$('#mentions-btn').parent().click(function(){
		loadMentions();
		transitionToSlide(1);
	});
	$('#favorites-btn').parent().click(function(){
		transitionToSlide(2);
	});
	$('#retweets-btn').parent().click(function(){
		transitionToSlide(3);
	});
	$('#follows-btn').parent().click(function(){
		transitionToSlide(4);
	});

	// Forces swipe. Updates selected button
	function transitionToSlide(index){
		Swiper.slide(index, 400);
		var buttons = $('.button-icon');
		buttons.removeClass('selected');
		$(buttons[index]).addClass('selected');
	}

	// close authentication overlay
	$('#close-overlay').click(function(){
		$('#auth-overlay').hide();
	});

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
					tweetText.innerHTML = data[i].text;


					// tweet options
					var tweetOptions = document.createElement('div');
					tweetOptions.className = "tweet-options";

					// - option: reply
					var replyOption = document.createElement('div');
					replyOption.className = "tweet-option reply-option";
					tweetOptions.appendChild(replyOption);
					// - option: retweet
					var retweetOption = document.createElement('div');
					retweetOption.className = "tweet-option retweet-option";
					tweetOptions.appendChild(retweetOption);
					// - option: favorite
					var favoriteOption = document.createElement('div');
					favoriteOption.className = "tweet-option favorite-option";
					tweetOptions.appendChild(favoriteOption);
					// - option: follow
					var followOption = document.createElement('div');
					followOption.className = "tweet-option follow-option";
					tweetOptions.appendChild(followOption);




					theTweet.appendChild(tweetImg);
					theTweet.appendChild(tweetText);
					theTweet.appendChild(tweetOptions);

					$(theTweet).click(function(){
						$(tweetOptions).toggle();
					});

					mentionsFragment.appendChild(theTweet);
				}());

			}
			containerNode.children[0].innerHTML = "";
			containerNode.children[0].appendChild(mentionsFragment);

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
						loadTimeline(accountId, function(){
							loadAccountInfo(accountId);
							transitionToSlide(0);
						});
					});

					var acctDeleter = document.createElement('img');
					acctDeleter.src = "images/delete.png";
					acctDeleter.className = "delete-btn";
					acctDeleter.addEventListener("click",function(){
						deleteAccount(accountId);
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
