var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var router = express.Router();

var { USERS, CREDENTIALS } = require('../data/mockData');

var JWT_SECRET = process.env.JWT_SECRET || 'oyci-secret-key';

// POST /api/auth/login
router.post('/login', function (req, res) {
  var { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  var normalizedEmail = email.trim().toLowerCase();
  var expected = CREDENTIALS[normalizedEmail];
  if (!expected || expected !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  var user = USERS.find(function (u) { return u.email === normalizedEmail; });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Account is inactive or not found.' });
  }

  var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

  var safeUser = Object.assign({}, user);
  delete safeUser.password;

  res.json({ token: token, user: safeUser });
});

// GET /api/auth/me  (validate token & return current user)
router.get('/me', function (req, res) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    var decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    var user = USERS.find(function (u) { return u.id === decoded.id; });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
