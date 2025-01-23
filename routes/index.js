var express = require('express');
var router = express.Router();
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

/* GET home page. */
router.get('/', ensureLoggedIn({ redirectTo: '/user/login' }), (req, res, next) => {
  res.render('index', { user: req.user });
});

module.exports = router;
