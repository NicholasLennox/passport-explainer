var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const passport = require('passport');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/user');

var app = express();

// Configure express-session
app.use(
  session({
    secret: 'yourSecretKey', // Replace with a strong, random secret for signing the session ID
    resave: false, // Prevents session being saved back to the store unless modified
    saveUninitialized: false, // Prevents creating empty sessions for unauthenticated users
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Message middleware
app.use((req, res, next) => {
  // Retrieve session messages or default to an empty array
  const msgs = req.session.messages || [];
  
  // Make messages available to all views in the current request cycle
  res.locals.messages = msgs;
  
  // Add a helper flag for conditional rendering in views
  // The `!!` converts `msgs.length` to a boolean: true if there are messages, false otherwise
  res.locals.hasMessages = !!msgs.length;
  
  // Clear messages from the session after moving them to locals
  req.session.messages = [];
  
  // Proceed to the next middleware
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/user', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
