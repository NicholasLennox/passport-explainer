const express = require('express');
const fs = require('fs');
const path = require('path');
const createError = require('http-errors');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const router = express.Router();

// Tell passport to use our strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    try {
      // Fetch users from JSON file
      const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf-8'));
      const user = users.find(u => u.username === username);

      // User not found
      if (!user) {
        return done(null, false, { message: 'User not found' });
      }

      // Incorrect password
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password' });
      }

      // Successful authentication
      return done(null, user);
    } catch (error) {
      // Pass error to Passport
      return done(error);
    }
  }
));

// Store the user's data in the session
passport.serializeUser((user, done) => {
  /*
    This method is called once, after successful authentication in the strategy.
    It determines what part of the user object to store in the session.
    
    For example, in the LocalStrategy, we call done(null, user) after successful authentication.
    That user object is passed here, and we decide to store only the username 
    (to keep the session lightweight and we dont have a userId). This data will later be used by 
    deserializeUser to reconstruct req.user.
  */
  done(null, { username: user.username });
});

// Retrieve the user's data from the session and set it to req.user
passport.deserializeUser((userData, done) => {
  /*
    This method is called on every request that requires authentication.
    Passport retrieves the data stored in the session (from serializeUser)
    and passes it to this method.

    Since the session already contains all the data we need (username),
    we simply return it as req.user. If more details were required, you would 
    fetch them here (e.g., from a database).
  */
  done(null, userData); // req.user will now be { username: 'example' }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/user/login'
}));

router.post('/logout', (req, res, next) => {
  req.logout( (err) => {
    if (err) { 
      return next(err); 
    }
    res.redirect('/user/login');
  });
});


router.get('/signup', (req, res) => {
  res.render('signup');
});

router.post('/signup', (req, res) => {

  // Extract the form data (using destructuring)
  const { username, password, confirm_password } = req.body;

  // Check if the passwords match
  if(password != confirm_password) {
    // Re-render signup. Include the username so they dont need to retype it and provide an error message.
    res.render('signup', { username, message: "Passwords do not match!"});
  }

  // Check if the user exists in the data store
  if(userExists(username)) {
    // Re-render signup. We dont want to return username, since its invalid, so we just return a message
    res.render('signup', { message: "User already exists!" });
  }

  // Add new user to data store
  addNewUser(username, password);

  // Redirect to allow the user to login
  res.redirect('/user/login');
});

function userExists(username) {
  try {
    // Read existing users
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf-8'));
    // Check if the username already exists
    return users.some(user => user.username === username);
  } catch (error) {
    console.error('Error reading or parsing users.json:', error);
    // Let the user know something went wrong (error handling middleware will catch this)
    throw createError(500);
  }
}

function addNewUser(username, password) {
  try {
    // We reuse the path to users.json so save it in a variable
    const filePath = path.join(__dirname, '../data/users.json');
    // Read existing users
    const users = JSON.parse(fs.readFileSync(filePath, 'utf-8')); 
    // Create new user object (to be stored)
    const newUser = { username, password }; 
    // Add new user to the array
    users.push(newUser); 
    // Write updated users back to the file
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8'); 
  } catch (error) {
    console.error('Error adding new user:', error);
    // Let the user know something went wrong (error handling middleware will catch this)
    throw createError(500);
  }
}



module.exports = router;
