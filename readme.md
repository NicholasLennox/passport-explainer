# PassportJS demo

This project uses the express-generator to create a template and then includes [PassportJS](https://www.npmjs.com/package/passport) and other needed dependencies to show:

- Local Strategy authentication (username and password)
- Session storage in memory (no persistence)
- User storage with passwords in plain text (JSON files)
- Route gaurding (endpoint protection)

## Table of contents

- [Project installation](#installation)
- [What are sessions?](#what-are-sessions-and-how-do-they-enable-authentication)
- [Extra dependencies](#extra-dependencies)
  - [express-session](#express-session)
- [The big picture of passport](#the-big-picture-of-passport)
- [Implementing authentication](#implementing-authentication)
  - [Registration and validation](#user-registration-and-validation)
  - [Login and logout with Passport](#adding-passport-for-login-and-logout)
  - [Showing login validation errors with middleware](#showing-login-validation-errors-with-middleware)

## Installation

This project was created using the generator with the following command:

```bash
express passport-demo --ejs
```

Then navigate into the project and install all the relevent default dependencies, run the following:

```bash
cd passport-demo
```

```bash
npm i 
```

**Note**: This may require an additional `npm audit fix --force` command to update some packages to secure versions if you are re-creating this yourself.

You can run the application right away with:

```bash
npm start
```

But the `debug` dependency wont work as it requires an environment variable to be set. The easiest way to get it to work is to alter the `start` script, for windows change it to the following:

```json
"scripts": {
    "start": "set DEBUG=passport-demo:* && node ./bin/www"
},
```

And for Linux/macOS change it to the following:

```json
"scripts": {
    "start": "DEBUG=passport-demo:* && node ./bin/www"
},
```

This configures `debug` to work with any (`*`) namespace - `:server` is included in the template and can be seen in `bin/www`:

```js
...
var debug = require('debug')('passport-demo:server');
...
```

You can add other namespaces and create debuggers to help distinguish between different areas of your application, for example, if you want to make a debugger to log auth-related messages you can do the following in any script in your application:

```js
...
var authDebug = require('debug')('passport-demo:auth');
...

authDebug('User logged in');
```

Now you can run the application with `npm start` and see the debug logs.

## What are sessions and how do they enable authentication?

At a high level, sessions are a mechanism that allows a web application to "remember" users as they navigate across different pages or make multiple requests. When a user logs in, the server creates a session - a temporary data store tied to the user - and assigns it a unique ID, which is stored in a cookie on the user's browser. On each subsequent request, the browser sends this session ID back to the server, allowing the server to identify the user and maintain their authenticated state without requiring repeated logins. This approach, known as **stateful authentication**, relies on the server to store session data and is a cornerstone of traditional web application security.

In modern development, JSON Web Tokens (JWTs) have gained popularity for **stateless authentication**, where the user’s data is encoded into a token and sent to the client. Unlike sessions, which store data on the server, JWTs do not require server-side storage, making them suitable for distributed systems and APIs. However, sessions remain well-suited for browser-based applications due to their simplicity, built-in support in frameworks, and server-side control over authentication state.

**Note**: While stateful security works well for browser-based applications, it can be less practical for devices that lack cookie support, such as some mobile or IoT devices. In these cases, stateless methods like JWTs are often preferred, as they don't depend on browser-specific mechanisms like cookies.

## Extra dependencies

To do what we need to do for this project we need the following dependencies installed:

```bash
npm i passport passport-local express-session connect-ensure-login
```

These packages work together to enable our session-based security approach.

**Note**: If time permits, I will create another repository demonstrating this authentication approach without additional dependencies (or possibly just using `express-session`). Seeing authentication stripped down to its bare bones, purely for educational purposes, can help clarify the core concepts.

The following sub-sections explain each dependency and how they contribute to the big picture of session-based authentication. Let’s start with the core: sessions.

### express-session

At its core, `express-session` is middleware that allows Express applications to manage session data. Recall, *"sessions enable a web application to remember users"* by storing relevant user data in something called a **session store**. Each entry in the session store is assigned a unique ID, and a cookie containing this ID is generated and sent to the user's browser. On each subsequent request, the browser sends this cookie back to the server, enabling the server to retrieve the corresponding session data. This prevents the user from having to log in every time they make a request to the server.

By default, sessions remain alive as long as the server is running. However, you can customize their lifespan by setting the `maxAge` field when configuring the session cookie (we dont need to do this yet). To invalidate a session, the session record is simply deleted from the store, requiring the user to log in again to continue using the application.

**Note**: Typically, sessions are configured to last for a few hours, but they can be extended to several days with "remember me" functionality.

From this, we can see there are two core components of session management: the **session store** and **cookie creation and parsing**.

Implementing these components manually is complex, even for simple use cases. Thankfully, `express-session` simplifies this process. In its default configuration, it:
1. **Stores sessions in memory** (suitable for development but not for production; in production, sessions are typically stored in a database or external store like Redis).
2. **Handles cookie creation and parsing**, ensuring the session ID is generated, sent to the browser, and retrieved from incoming requests to access session data.

All of this functionality is abstracted away, and we interact with it via the `req.session` object, making session management straightforward to use in code.

To enable and configure `express-session` with its default functionality, add the following to `app.js`:

```js
// app.js
...
const session = require('express-session');
...
app.use(
  session({
    secret: 'yourSecretKey', // Replace with a strong, random secret for signing the session ID
    resave: false, // Prevents session being saved back to the store unless modified
    saveUninitialized: false, // Prevents creating empty sessions for unauthenticated users
  })
);
```

While we aren't implementing proper secret management, I feel it is worth atleast gaining a conceptual understanding of this - as secrets are common in all areas of developement. 

In `express-session`, the **secret** is a key used to **sign** session cookies (create a cryptographic signature to ensure data integrity). This ensures that the server can **verify** the cookie and detect any **tampering**. Recall, when a session is created, a unique ID is generated and stored in the cookie - this is then signed using the key. On subsequent requests, the server checks the signature to confirm the cookie’s validity. If the cookie has been modified, the signature verification fails, and the session is invalidated.

Keeping the signing key secure is essential. If exposed, an attacker could forge valid cookies and impersonate users. To mitigate this risk:

- Use a strong, random value for the key.
- Store it securely in an environment variable rather than hardcoding it into your application.
- Rotate it periodically or in response to a potential security breach.

The other options (`resave` and `saveUninitialized`) just is more configuration for the data store. There is no additional cookie configuration leaving it as default. To customize how cookies are generated and parsed you can add an additional `cookie` field with various options. An example is shown below:

```js
app.use(
  session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour (in milliseconds)
      httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
      secure: false, // Set to true if using HTTPS
    },
  })
);
```

**Note**: This was done purely for demonstration purposes and will not be included in the final code.

Okay now that we have sessions set up, lets create a simple demonstration to see it in action. To do this we just configure a simple endpoint (not going to place it in its own route) and show how we can use `req.session` to interact with the session store:

```js
// app.js
...
// Placement before the 404 error catcher is vital
app.get('/sesh', (req, res) => {
  req.session.views = (req.session.views || 0) + 1;
  res.send(`You have visited this page ${req.session.views} times.`);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
...
```

If we start the application and navigate to `http://localhost:3000/sesh` we see the following:

![Session-1](./screenshots/session-1.png)

When we refresh the page a few times, the counter increases:

![Sesh refresh](./screenshots/sesh-refresh.png)

![Session-10](./screenshots/session-10.png)

This shows that the server keeps track of the session, incrementing the count for each request tied to the same session.

Even if we close the browser, reopen it, and navigate back to the same URL, the session persists, and the view count continues to increase:

![session-11](./screenshots/session-11.png)

However, if we open a new incognito window, the view count resets:

![Incognito](./screenshots/session-incog.png)

This happens because incognito mode isolates cookies from your normal browsing session. Since the server doesn’t receive the original session cookie, it treats this as a new session and starts a fresh view count.

To see how session cookies persist in the same browsing context, you can open a new regular browser window and navigate to the URL again. The server recognizes the session cookie stored in your browser and retrieves the existing session, continuing to increment the view count:

![Session-12](./screenshots/session-12.png)

Finally, if we look at the server logs, we can observe that 13 requests were made in total. These correspond to two distinct sessions: one with 12 views (from the regular browsing session) and one with a single view (from the incognito session):

![Total requests](./screenshots/all-requests-log.png)

Now, if we go back to our session config we see the following line:

```js
app.use(
  session({
    ...
    saveUninitialized: false, // Prevents creating empty sessions for unauthenticated users
  })
);
```

Now, we have no authenticated users, yet we clearly have sessions being created - why is this happening?

By default, `express-session` creates a session object for every request, even if you don’t store any data in it. This behavior can lead to unnecessary overhead, especially for applications with high traffic, because it creates many "empty" sessions in the session store.

Setting `saveUninitialized: false` ensures that sessions are not automatically saved to the store **unless you explicitly modify the `req.session` object**. Since we are directly modifiying the session with `req.session.views` it has to be created for us.

The last thing to look at here before we move on to passport is the actual cookie that is being created.

In Chrome, if we open dev tools and navigate to the **application** tab we will find a **cookies** drop down.

Expand this and look for the cookies on our domain (`localhost`). There you will find our singular cookie with its session ID (`sid`) digitally signed using our secret. This is what the browser passes on every request to our sever and our server uses to verify the integrity of the cookie and then fetch the relevant data - in our case, `views`.

![Cookies](./screenshots/cookie.png)

In this screenshot you can see some of the properties that were mentioned earlier, and some others. These are not important for now, just understand that there is a lot of effort placed into ensuring cookies are safe from various attacks, such as cross-site scripting (XSS) and cross-site request forgery (CSRF).

**Note**: Authentication, in the way that we are doing it for this assingment, can technically be done purely with sessions (no passport). You may notice ChatGPT suggesting the use of `req.session` to handle all the login/logout logic. Keep in mind, that this is a very manual approach and quickly becomes difficult to manage which is why we use libraries like passport which handle all the session management for us.

## The big picture of Passport

Passport's main job is to authenticate requests, and it does this using a design pattern called the **strategy pattern**. In simple terms, a strategy in Passport is like a module that handles a specific type of authentication. For example, one strategy might handle username and password authentication, while another works with Google logins. This modularity makes Passport flexible and adaptable to many authentication scenarios. For our assignment, we’ll use the `LocalStrategy`, which handles authentication using usernames and passwords.

Once a user is authenticated, Passport integrates with `express-session` to manage their logged-in state. This process involves two key methods:

- **`serializeUser`** specifies what part of the user’s data should be stored in the session. Typically, this would be a unique identifier like a user ID. In this assignment, since we’re using `username` as the identifier, it is stored in the session instead.
- **`deserializeUser`** uses the data stored in the session to retrieve the full user object. For this assignment, we don’t need to fetch a full user object because `username` is all we need. This approach will evolve in future modules.

**Note**: When working with Passport, you don’t need to interact directly with `req.session` to manage logged-in users. Passport uses `req.session` internally and provides the authenticated user as `req.user`. Passport also offers built-in methods to verify and clear sessions, which we’ll explore later.

Now that we have a conceptual understanding of Passport and how it works with `express-session`, let’s build a login system and see how these concepts are implemented.

## Implementing authentication

To implement authentication, we need the following:

- A place to store our user data.
- A register view with a form.
- A login view with a form.
- A way to log the current user out.
- A router to organize and manage the routes for serving the views and handling their submissions.

Most of this does not require passport. Remember, all it does it authenticate an existing user, eveything else we do. If you want to skip user registration and go straight to integrating passport click [here](#adding-passport-for-login-and-logout) or scroll down to the next sub-section. Dont worry if you dont have a way to create users, you can use the existing ones in `users.json`, this next sub-section just helps clarify how the registration process is handled, and how you can pass error messages back to the user if their passwords don't match or they are trying to use an existing username.  

**Note**: These examples will contain no CSS and minimal HTML to keep the focus on authentication.

### User registration and validation

For this assignment, we’ll store user data in a plain-text JSON file located at `data/users.json`. An example of the file structure is shown below:

```json
[
    {
        "username": "bob",
        "password": "builder123"
    },
    {
        "username": "alice",
        "password": "wonderland"
    }
]
```

Here, we have two existing users, `bob` and `alice`, along with their passwords. It is important to keep in mind, this setup is for educational purposes only. In a real-world application:

- Users would be stored in a database.
- Passwords would be securely hashed and salted, not stored in plain text.
- Each user would have a unique, immutable (unchanging) ID.

We'll explore these best practices in the next modules when we implement databases. For now, lets continue. 

The next step is to setup our basic views to handle signing up and logging in. We will start basic by just setting up the routes for the views:

```js
// routes/user.js
const express = require('express');
const router = express.Router();

router.get('/signup', (req, res) => {
  res.render('signup');
});

module.exports = router;
```

We then can add this route to our express app:

```js
// app.js
...
const usersRouter = require('./routes/user');
...
app.use('/user', usersRouter);
...
```

Now we need to make our views for these routes:

```html
<!-- views/signup.ejs -->
<h1>Sign up</h1>
<form action="/user/signup" method="POST">
    <div>
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
    </div>
    <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
    </div>
    <div>
        <label for="confirm-password">Confirm password:</label>
        <input type="password" id="confirm-password" name="confirm-password" required>
    </div>
    <button type="submit">Sign up</button>
</form>
<p>Already have an account? <a href="/user/login">Login</a></p>
```

At this point, we can navigate to our view but cant submit the form. This is because we are missing the POST route to handle the form submission.

Let's start simple and build up our post route for sign up:

```js
// routes/user.js
...
router.post('/signup', (req, res) => {
  // Extract the form data (using destructuring)
  const { username, password, confirm_password } = req.body;
  // To be continued...
});
...
```

In `app.js`, `app.use(express.urlencoded({ extended: false }));` is middleware provided by Express that parses incoming requests with `application/x-www-form-urlencoded` payloads (the default encoding for HTML forms). This middleware allows you to access form data using `req.body`. The `extended: false` flag means it uses query strings (default behaviour with submit on forms). These query strings are formed by creating simple key-value pairs using the `name` attribute from the input fields in the form.

There are two checks we want to do before adding the users to our data store, we want to check if the passwords match and if the user exists in the data store. If either of these fail, we want the user to go back to the sign in page and see an error telling them what has gone wrong. Additionally, we dont want them to have to retype their username each time as it is frustrating for the user to do that. In order to achieve this, we need to make use of EJS variables and alter our signup view to include these messages.

```js
// routes/user.js
...
const fs = require('fs');
const path = require('path');
// We want to tell the user when something goes wrong on the server
const createError = require('http-errors'); 
...
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
    // Re-render signup. We dont want to return username, since its invalid, so we just return a message.
    res.render('signup', { message: "User already exists!" });
  }

  // Add new user to data store
  // To be continued...
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
...
```

Our two failure conditions are catered for and we send error messages back to the view to be shown to the user. We also make use of a helper function that checks our data store (`users.json`) and sees if a user exists with that username (this is meant to be unqiue). We access `users.json` by using the `fs` (file system) module and `path` (`__dirname` tells us where we are in the project so our relative pathing - `../` - works as intended). If anything goes wrong on the server, we use `http-errors` to create a 500 erorr and throw it to the error handling middleware to render `error.ejs` with our error object so the user knows something went wrong.

**Note**: if we throw errors like this in async functions the middleware wont catch it, this is a quirk with node and express. In a later module when we will be accessing data asynchonously, we will revisit it. In short, you need to use `next(err)` and cant just `throw err;`.

Before we add our user to the store, lets see how our `signup` view has changed to accomodate our error messages and username placeholders:

```html ejs
<!-- views/signup.ejs -->
<h1>Sign up</h1>
<form action="/user/signup" method="POST">
    <div>
        <label for="username">Username:</label>
        <!-- Fetch the username if available -->
        <input 
            type="text" 
            id="username" 
            name="username" 
            value="<%= locals.username || '' %>"  
            required
        >
    </div>
    <div>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
    </div>
    <div>
        <label for="confirm_password">Confirm password:</label>
        <input type="password" id="confirm_password" name="confirm_password" required>
    </div>
    <button type="submit">Sign up</button>
</form>
<p>Already have an account? <a href="/user/login">Login</a></p>

<!-- Showing error message if there is one -->
<% if (locals.message) { %>
    <div>
        <span style="color: red;">Error: <%= message %></span>
    </div>
<% } %>
```

You'll notice we access the variables through `locals`, but never actually set `res.locals.username` or `res.locals.message` in our route. How does this happen?

When you pass variables to `res.render`, Express automatically adds them to `res.locals`, making them available in your EJS template for the current request response cycle. In your template, if you access a variable via locals (e.g., `<%= locals.message %>`), it will safely return `undefined` if the variable was not set, without causing an error. 

If you try to directly access `message` without passing it (not via `locals`), the template will throw an error because the variable doesn’t exist in that context - `locals` always exists which is why it behaves differently. This happens when we first render the signup view in our `/signup` get route since we just say `res.render('signup');`. Technically, we could just pass empty values like this:

```js
// routes/user.js
...
router.get('/signup', (req, res) => {
  res.render('signup', { username: '', message: '' });
});
```

But this is a little messy and its useful to understand what `locals` can be used for - so lets stick to what we did (`res.render('signup');`).

Now that we've seen how user error handling can be implemented with messages, its time to finish off this signup route and actually add our user to the data store. 

Once that is successful we want to redirect to `/users/login` so they can login with their new credentials - this is also where we will implement passport.

```js
// routes/user.js
...
router.post('/signup', (req, res) => {
  ...
  // Add new user to data store
  addNewUser(username, password);
  
  // Redirect to allow the user to login
  res.redirect('/user/login');
});

...

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
```

Now we can register new users through `signup` and have them stored in `users.json`. It is imporant to pay attention to our errors in this section.
For errors that result from validation (mismatched passwords or using an existing username) are handled differently that actual server errors (cant read, write, or parse `users.json`). For validation errors we want to tell the user what they did wrong via a message passed back to the view. For server erorrs we simply want to let the user know something went wrong and log the details on the server (in a simple way).

At this point, we are ready to integrate passport and log our users in.

### Adding passport for login and logout

Recall, passports job is to handle user authentication. This means verifying a users credentials using one of its strategies, managing the user session so they can remain logged in, and logging the user out by destroying the session.

Before we can do this, we need to create routes and a view for our login.

```js
// routes/user.js
...
router.get('/login', (req, res) => {
  res.render('login');
});
...
```

```html ejs
<!-- views/login.ejs -->
<h1>Login</h1>
<form action="/user/login" method="POST">
  <div>
      <label for="username">Username:</label>
      <input type="text" id="username" name="username" required>
  </div>
  <div>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required>
  </div>
  <button type="submit">Login</button>
</form>
<p>Don't have an account? <a href="/user/signup">Sign up</a></p>
```

Now that we have that set up, we can configure our applicaiton to use passport:

```js
// app.js
...
const passport = require('passport');
...
app.use(passport.initialize());
app.use(passport.session());
...
```

`app.use(passport.initialize());` initializes Passport and adds it as middleware to handle authentication.

`app.use(passport.session());` integrates Passport with `express-session`, allowing user information to be serialized and deserialized into the session store.


Once we have configured passport, we can implement it. Recall, passport has three key methods:

- **Verify with Local Strategy** defines how Passport checks the user's credentials (username and password) during login.
- **Serialize** determines what user data (e.g., `username`) is stored in the session to keep it lightweight.
- **Deserialize** uses the stored data to fetch the full user details on subsequent requests, making the authenticated user available as `req.user`.

Beginning with our verify method:

```js
// routes/user.js
...
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
...
// Tell passport to use our strategy
passport.use(new LocalStrategy(
  // Implement the strategy (verify method)
  (username, password, done) => {
    // Logic for verifying the user goes here
  }
));
```

The first thing to notice here is that we’re **defining and registering a strategy** with Passport. Recall, a strategy in Passport is essentially a way to handle a specific type of authentication. In this case, we’re using the `LocalStrategy`, which is designed for username and password authentication.

When we call `passport.use`, we’re telling Passport to use this strategy. The `LocalStrategy` requires us to implement a method called `verify`, which takes three arguments:

- `username`: By default, Passport looks for a field named `username` in the request body. If your app uses a different field name, such as `email`, you can specify this using `usernameField: 'email'`.
- `password`: Similarly, Passport expects a field named `password`. If you’re using a different name, such as `pw`, you can specify this with `passwordField: 'pw'`.
- `done`: A callback function provided by Passport. This is what we call once we’ve completed the authentication logic. Depending on the outcome, we call it with either the authenticated user or an error.

The verify method is where all the logic for authenticating a user happens: fetching their details, validating their credentials, and determining whether they can proceed. This structure gives us the flexibility to adapt Passport to the specifics of our app while still handling most of the authentication flow for us.

Let's go implement our `verify` logic:

```js
// routes/user.js
...
passport.use(new LocalStrategy(
  (username, password, done) => {
    try {
      // Fetch users from JSON file
      const users = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf-8'));
      // Find the user by their username
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
...
```

Recall, the `done` callback is how we communicate the outcome of the authentication process back to Passport.

The `done` function takes three parameters. The first is an `error` object, which is used if something goes wrong on the server (e.g., a file read error). The second is the authenticated `user` object, or `false` if authentication fails. The third is an optional `info` object, often used to provide a message explaining why authentication failed. For example, if a user is not found, we would call `done(null, false, { message: 'User not found' })`.

Now that we understand how done works, let’s look at how the `verify` method uses it. The first step is to check if the user exists. This is done by fetching the list of users from our JSON file and looking for a match based on the provided username. If no match is found, we call `done` with `false` and a `message` explaining the issue.

Next, we check if the password is correct. If it doesn’t match the one stored for the user, we again call `done` with `false` and a `message`. If both checks pass, we call `done(null, user)` to indicate a successful login.

The try-catch block handles any server-side errors, such as a failure to read the JSON file. When such an error occurs, calling `done(error)` ensures Passport handles it gracefully and passes it through the middleware chain.

This logic should feel familiar—it’s very similar to what we implemented for `signup`. The key difference here is how Passport integrates this into its flow. In `signup`, we handled feedback and errors directly in the route handler. With Passport, while the process of passing error messages might feel similar, the real benefit comes from centralizing authentication logic. Instead of writing separate validation logic in every route that requires authentication, Passport allows us to define it once in the strategy. This makes the code more modular and reusable, especially as our app grows and we introduce additional strategies (like OAuth or JWT). Although the initial setup might feel like extra work, Passport’s abstraction reduces repetitive tasks and keeps the authentication process consistent across the app.

We have to add some code to actually pass and access the messages in our login view, we will come back to this - we first want to finish the implementation of passport with `serializeUser` and `deserializeUser`:

```js
// routes/user.js
...
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
...
```

Now we have completed everything Passport needs to function. Let's implement our login POST route where we actually need to authenticate the user:

```js
// routes/user.js
...
router.post('/login', passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/user/login'
}));
...
```

Let’s break this down since it looks a bit different from what we’re used to. The first thing you’ll notice is that we don’t do anything with `req` or `res` directly. This is because Passport handles all of that for us - that’s what all the setup was for. All we have to do is supply the correct Passport middleware to the route.

Recall that Passport has many strategies that offer different ways to log in, and it keeps track of these with internal labels. By passing the value `'local'` to our authenticate method, we’re telling Passport to use the `LocalStrategy` that we implemented earlier. This highlights the modularity of Passport, where we could define many different strategies and have different login routes to allow users to log in using various methods (e.g., Google, Facebook).

**Note**: While we can add a `(req, res) => {...}` callback to this route, it will only be called after the authentication process is complete and the redirects are handled. This can be useful if you want to perform additional actions (e.g., logging, custom error messages) after authentication succeeds or fails. However, in most cases, the `passport.authenticate` middleware is sufficient to handle the authentication flow.

All we need to supply to Passport is some information about what to do when authentication is successful or unsuccessful. In our case, we redirect to the home page (`/`) on success and back to `/user/login` on failure.

We can edit our `index.js` route and `index.ejs` view to show our logged in user:


```js
// routes/index.js
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  // Pass the user to the view
  res.render('index', { user: req.user });
});

module.exports = router;
```

```html ejs
<!DOCTYPE html>
<html>
  <head>
    <title>Home</title>
    <link rel='stylesheet' href='/stylesheets/style.css' />
  </head>
  <body>
    <h1>Home page</h1>
    <% if (user) { %>
      <p>Welcome, <%= user.username %>!</p>
      <form action="/user/logout" method="post">
        <button class="logout" type="submit">Sign out</button>
      </form>
    <% } %>
  </body>
</html>
```

Now we can login and see our username on the home page. You'll notice if we fail to login we don't see those messages we configured earlier - we will come back to that. For now, lets finish this off with the implementation of a logout and a way to enforce that routes require authenticated users to access them.

Implementing logout is simple with passport:

```js
// routes/user.js
...
router.post('/logout', (req, res, next) => {
  req.logout( (err) => {
    if (err) { 
      return next(err); 
    }
    res.redirect('/user/login');
  });
});
...
```

The `req.logout` method is provided by Passport and is used to remove the authenticated user from the session.

The method takes an optional callback function that runs after the logout process is complete. If an error occurs during logout, we pass it to the `next(err)` function to handle the error. Otherwise, we redirect the user to the login page (`/user/login`) to indicate that they've been successfully logged out.

The last thing we want to do is create middleware to protect routes that should only be accessed by authenticated users. There is a package to do this called `connect-ensure-login` that we have installed earlier.

In our example, we want to ensure that users are logged in if they try access our home page (`/`) and if they aren't, theyre redirected to login:

```js
// routes/index.js
...
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
...
router.get('/', ensureLoggedIn({ redirectTo: '/user/login' }), (req, res, next) => {
  res.render('index', { user: req.user });
});
...
```

This dependency works with `express-session` to ensure there is an authenticated user. The placement of `ensureLoggedIn` is key because the route handler `(req, res, next) => {...}` will only be reached if `ensureLoggedIn` verifies that the user is logged in. If the user is not authenticated, `ensureLoggedIn` will automatically redirect them to the login page we specified with `redirectTo`.

Now we have a full login and registration system. The last thing to do is the extra step of showing the user messages when there are login validation issues. For `signup` we implemented this manually with `res.render` which worked for our small example but can quickly become complicated and difficult to manage. For the login we are going to take inspiration from [this](https://github.com/passport/todos-express-password) official passport example and setup middleware to add the messages to `res.locals` for us.

### Showing login validation errors with middleware
