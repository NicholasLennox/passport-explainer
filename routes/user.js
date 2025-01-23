const express = require('express');
const fs = require('fs');
const path = require('path');
const createError = require('http-errors');
const router = express.Router();

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

router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;
