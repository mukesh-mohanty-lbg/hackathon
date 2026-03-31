var express = require('express');
var router = express.Router();

var { USERS } = require('../data/mockData');

// In-memory store (seeded from mock data)
var users = JSON.parse(JSON.stringify(USERS));

// GET /api/users — list all users (optional ?role=staff&active=true)
router.get('/', function (req, res) {
  var result = users;
  if (req.query.role) {
    result = result.filter(function (u) { return u.role === req.query.role; });
  }
  if (req.query.active !== undefined) {
    var isActive = req.query.active === 'true';
    result = result.filter(function (u) { return u.isActive === isActive; });
  }
  res.json(result);
});

// GET /api/users/:id
router.get('/:id', function (req, res) {
  var user = users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

// POST /api/users — create a new user
router.post('/', function (req, res) {
  var data = req.body;
  if (!data.name || !data.email || !data.role) {
    return res.status(400).json({ error: 'name, email, and role are required.' });
  }
  var newUser = Object.assign({}, data, { id: 'u' + Date.now(), isActive: data.isActive !== false });
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT /api/users/:id — update a user
router.put('/:id', function (req, res) {
  var idx = users.findIndex(function (u) { return u.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  users[idx] = Object.assign({}, users[idx], req.body);
  res.json(users[idx]);
});

// PATCH /api/users/:id/toggle-access — toggle isActive
router.patch('/:id/toggle-access', function (req, res) {
  var user = users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.isActive = !user.isActive;
  res.json(user);
});

// PATCH /api/users/:id/availability — update availability status
router.patch('/:id/availability', function (req, res) {
  var user = users.find(function (u) { return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  var { status, note } = req.body;
  if (status) user.availability = status;
  if (note !== undefined) user.availabilityNote = note;
  res.json(user);
});

module.exports = router;
module.exports._store = users;
