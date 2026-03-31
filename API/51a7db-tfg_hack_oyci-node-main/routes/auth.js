var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();

var { db, rowToUser } = require('../data/db');

var JWT_SECRET = process.env.JWT_SECRET || 'oyci-secret-key';

// POST /api/auth/login
router.post('/login', function (req, res) {
  var { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  var normalizedEmail = email.trim().toLowerCase();
  var cred = db.prepare('SELECT password FROM credentials WHERE email = ?').get(normalizedEmail);
  if (!cred || cred.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  var row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  var user = rowToUser(row);
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Account is inactive or not found.' });
  }

  var token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token: token, user: user });
});

// GET /api/auth/me  (validate token & return current user)
router.get('/me', function (req, res) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    var decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    var row = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    var user = rowToUser(row);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
