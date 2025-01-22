const express = require('express');
const fs = require('fs');
const path = require('path');
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
  if(addNewUser(username, password)) {
    // If successful we redirect to login
    res.redirect('/user/login')
  }
});

function userExists(username) {
  try {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf-8'));
    return users.some(user => user.username === username);
  } catch (error) {
    console.error('Error reading or parsing users.json:', error);
    return false;
  }
}

function addNewUser(username, password) {
  try {
    const filePath = path.join(__dirname, '../data/users.json');
    const users = JSON.parse(fs.readFileSync(filePath, 'utf-8')); // Read existing users
    const newUser = { username, password }; // Create new user object
    users.push(newUser); // Add new user to the array
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8'); // Write updated users back to the file
    console.log(`User ${username} added successfully.`);
    return true;
  } catch (error) {
    console.error('Error adding new user:', error);
    return false;
  }
}

router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;
