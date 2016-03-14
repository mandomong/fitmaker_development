var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');

global.pool = require('./config/dbpool');
require('./config/passportconfig')(passport);

var winston = require('winston');
var loggingconfig = require('./config/loggingconfig'); // logging config

// ----- Loading router-Level middleware modules ----- //
var auth = require('./routes/auth');

var index = require('./routes/index');
var users = require('./routes/users');

var curriculum = require('./routes/curriculum');
var ranking = require('./routes/ranking');
var records = require('./routes/records');
var projects = require('./routes/projects');
var relation = require('./routes/relation');
var friends = require('./routes/friends');
var resfriends = require('./routes/resfriends');
var badges = require('./routes/badges');

var app = express();
app.set('env', 'development');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//3. express 초기화
app.use(session({
  //"secret": "i2+oCQts4kysnjc67CkdwuO3jSlY6r/cJDzTr11qUUg=",
  "secret": process.env.FITMAKER_SERVER_KEY,
  "cookie": { "maxAge": 86400000 },
  "resave": true,
  "saveUninitialized": true
}));

//4. passport 초기화, 세션 - 순서에 민감하다 !
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));


// ------ mount points configuration ------ //
// ------ Mapping mount points with router-Level middleware modules ------ //
app.use('/', index);
app.use('/users', users);
app.use('/curriculum',curriculum);
app.use('/ranking',ranking);
app.use('/records',records);
app.use('/projects', projects);
app.use('/auth',auth);
app.use('/relation',relation);
app.use('/friends',friends);
app.use('/resfriends', resfriends);
app.use('/badges', badges);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {

    var Logger = new winston.Logger(loggingconfig);
    Logger.log('warn', err);

    res.status(err.status || 500);
    res.json(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  Logger.log('warn', err);

  res.json({
    message: err.message,
    error: {}
  });
});



module.exports = app;