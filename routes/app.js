
/*
 * GET home page.
 */

var twitter = require('twit');

var x = require('./../x');


exports.app = function(req, res){

	if(!req.session.user){
		res.redirect('/');
		return;
	}


	var accountName;
	var picSrc;
	var tweetInfo;

	renderPage();


	function renderPage(){
		res.render('app', {
			title: 'Twitter Manager!',
			accountName: accountName,
			picSrc: picSrc,
			tweets: tweetInfo
		});
	}

};
