const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const socket = require('./apis/socket')(io);
const setupAPI = require('./apis/express');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// FOR TESTING
const cc = require('./services/cryptocompare');
new cc({ hot: true });
setupAPI(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

// TODOS:
// Long polling HTTP API
// ^ long-lived cc instance?
// Historical price API
// API Improvements - maybe time-based socket limiting (i.e. one per x mstebkdcj
// ^ read up on observable implementations for ideas
// Make utils.js to abtract utils across APIs (like safety checks)
