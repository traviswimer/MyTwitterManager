
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , appRoute = require('./routes/app')
  , ajax = require('./routes/ajax')
  , http = require('http')
  , path = require('path');

var MemStore = express.session.MemoryStore;

var app = express();


var login = require('./login/login');


app.configure(function(){
  app.use(express.cookieParser());
  app.use(express.session({secret: 'secret_key', store: MemStore({
    reapInterval: 60000 * 10
  })}));

  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');

  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());


  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));

});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/', function(req, res){

  // Check if user is logged in
  if(req.session.user){
    res.redirect('/app');
    return;
  }

  if(req.body.login_submit && req.body.username && req.body.password){
    login.authenticate(req, res, routes.index);
  }else if(req.body.register_submit && req.body.username && req.body.password){
    login.register(req, res, routes.index);
  }else{
    routes.index(req, res);
  }

});
app.get('/app', appRoute.app);
app.get('/ajax/load_accounts', ajax.loadAccounts);
app.get('/ajax/account', ajax.account);

app.get('/ajax/timeline', ajax.timeline);
app.get('/ajax/mentions', ajax.mentions);
app.get('/ajax/favorites', ajax.favorites);
app.get('/ajax/retweets', ajax.retweets);
app.get('/ajax/followers', ajax.followers);

app.get('/ajax/postTweet', ajax.postTweet);
app.get('/ajax/makeFavorite', ajax.makeFavorite);
app.get('/ajax/makeRetweet', ajax.makeRetweet);
app.get('/ajax/follow', ajax.follow);


app.get('/ajax/remove_account', ajax.removeAccount);
app.get('/ajax/oauth', ajax.oauth);
app.get('/oauthed', ajax.oauthed);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
