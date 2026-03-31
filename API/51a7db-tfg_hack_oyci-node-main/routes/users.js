var express = require('express');
var router = express.Router();

var { db, rowToUser } = require('../data/db');

// GET /api/users — list all users (optional ?role=staff&active=true)
router.get('/', function (req, res) {
  var clauses = [];
  var params = {};
  if (req.query.role) {
    clauses.push('role = @role');
    params.role = req.query.role;
  }
  if (req.query.active !== undefined) {
    clauses.push('isActive = @isActive');
    params.isActive = req.query.active === 'true' ? 1 : 0;
  }
  var sql = 'SELECT * FROM users' + (clauses.length ? ' WHERE ' + clauses.join(' AND ') : '');
  var rows = db.prepare(sql).all(params);
  res.json(rows.map(rowToUser));
});

// GET /api/users/:id
router.get('/:id', function (req, res) {
  var row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'User not found.' });
  res.json(rowToUser(row));
});

// POST /api/users — create a new user
router.post('/', function (req, res) {
  var data = req.body;
  if (!data.name || !data.email || !data.role) {
    return res.status(400).json({ error: 'name, email, and role are required.' });
  }
  var id = 'u' + Date.now();
  db.prepare(`
    INSERT INTO users (id, name, email, role, phone, availability, availabilityNote, isActive, joinedDate, payType, contractedHours, workingDays)
    VALUES (@id, @name, @email, @role, @phone, @availability, @availabilityNote, @isActive, @joinedDate, @payType, @contractedHours, @workingDays)
  `).run({
    id: id,
    name: data.name,
    email: data.email,
    role: data.role,
    phone: data.phone || null,
    availability: data.availability || 'available',
    availabilityNote: data.availabilityNote || null,
    isActive: data.isActive !== false ? 1 : 0,
    joinedDate: data.joinedDate || null,
    payType: data.payType || null,
    contractedHours: data.contractedHours || null,
    workingDays: data.workingDays ? JSON.stringify(data.workingDays) : null,
  });
  // Also add default credentials
  if (data.email) {
    db.prepare('INSERT OR IGNORE INTO credentials (email, password) VALUES (?, ?)').run(data.email.toLowerCase(), 'abc123');
  }
  var row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json(rowToUser(row));
});

// PUT /api/users/:id — update a user
router.put('/:id', function (req, res) {
  var existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found.' });
  var data = req.body;
  db.prepare(`
    UPDATE users SET name=@name, email=@email, role=@role, phone=@phone, availability=@availability,
    availabilityNote=@availabilityNote, isActive=@isActive, joinedDate=@joinedDate, payType=@payType,
    contractedHours=@contractedHours, workingDays=@workingDays WHERE id=@id
  `).run({
    id: req.params.id,
    name: data.name !== undefined ? data.name : existing.name,
    email: data.email !== undefined ? data.email : existing.email,
    role: data.role !== undefined ? data.role : existing.role,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    availability: data.availability !== undefined ? data.availability : existing.availability,
    availabilityNote: data.availabilityNote !== undefined ? data.availabilityNote : existing.availabilityNote,
    isActive: data.isActive !== undefined ? (data.isActive ? 1 : 0) : existing.isActive,
    joinedDate: data.joinedDate !== undefined ? data.joinedDate : existing.joinedDate,
    payType: data.payType !== undefined ? data.payType : existing.payType,
    contractedHours: data.contractedHours !== undefined ? data.contractedHours : existing.contractedHours,
    workingDays: data.workingDays !== undefined ? JSON.stringify(data.workingDays) : existing.workingDays,
  });
  var row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(rowToUser(row));
});

// PATCH /api/users/:id/toggle-access — toggle isActive
router.patch('/:id/toggle-access', function (req, res) {
  var existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET isActive = ? WHERE id = ?').run(existing.isActive ? 0 : 1, req.params.id);
  var row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(rowToUser(row));
});

// PATCH /api/users/:id/availability — update availability status
router.patch('/:id/availability', function (req, res) {
  var existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found.' });
  var { status, note } = req.body;
  if (status) db.prepare('UPDATE users SET availability = ? WHERE id = ?').run(status, req.params.id);
  if (note !== undefined) db.prepare('UPDATE users SET availabilityNote = ? WHERE id = ?').run(note, req.params.id);
  var row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(rowToUser(row));
});

module.exports = router;
