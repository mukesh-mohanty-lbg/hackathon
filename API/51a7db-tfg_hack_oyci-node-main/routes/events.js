var express = require('express');
var router = express.Router();

var { db, getFullEvent, getAllEvents, getEventById, findInstance } = require('../data/db');

// GET /api/events — list all events (optional ?type=workshop&published=true)
router.get('/', function (req, res) {
  var clauses = [];
  var params = {};
  if (req.query.type) {
    clauses.push('type = @type');
    params.type = req.query.type;
  }
  if (req.query.published !== undefined) {
    clauses.push('isPublished = @isPublished');
    params.isPublished = req.query.published === 'true' ? 1 : 0;
  }
  var sql = 'SELECT * FROM events' + (clauses.length ? ' WHERE ' + clauses.join(' AND ') : '');
  var rows = db.prepare(sql).all(params);
  res.json(rows.map(getFullEvent));
});

// GET /api/events/:id
router.get('/:id', function (req, res) {
  var event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json(event);
});

// POST /api/events — create a new event
router.post('/', function (req, res) {
  var data = req.body;
  if (!data.title || !data.type || !data.venue) {
    return res.status(400).json({ error: 'title, type, and venue are required.' });
  }
  var eventId = 'e' + Date.now();
  var createdAt = new Date().toISOString().split('T')[0];

  var insertEvent = db.transaction(function () {
    db.prepare(`
      INSERT INTO events (id, title, description, type, venue, requiredStaff, maxAttendees, recurrence, ageGroup, tags, createdBy, createdAt, isPublished, publishedAt)
      VALUES (@id, @title, @description, @type, @venue, @requiredStaff, @maxAttendees, @recurrence, @ageGroup, @tags, @createdBy, @createdAt, @isPublished, @publishedAt)
    `).run({
      id: eventId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      venue: data.venue,
      requiredStaff: data.requiredStaff || 1,
      maxAttendees: data.maxAttendees || 20,
      recurrence: data.recurrence || 'none',
      ageGroup: data.ageGroup || null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      createdBy: data.createdBy || null,
      createdAt: createdAt,
      isPublished: data.isPublished ? 1 : 0,
      publishedAt: data.publishedAt || null,
    });

    // Insert instances
    (data.instances || []).forEach(function (inst) {
      var instId = inst.id || ('i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      db.prepare(`
        INSERT INTO event_instances (id, eventId, date, startTime, endTime, shiftStartTime, shiftEndTime, venueOverride, maxAttendees, status)
        VALUES (@id, @eventId, @date, @startTime, @endTime, @shiftStartTime, @shiftEndTime, @venueOverride, @maxAttendees, @status)
      `).run({
        id: instId,
        eventId: eventId,
        date: inst.date,
        startTime: inst.startTime,
        endTime: inst.endTime,
        shiftStartTime: inst.shiftStartTime || null,
        shiftEndTime: inst.shiftEndTime || null,
        venueOverride: inst.venueOverride || null,
        maxAttendees: inst.maxAttendees || data.maxAttendees || 20,
        status: inst.status || 'scheduled',
      });

      (inst.staffAssigned || []).forEach(function (staffId) {
        db.prepare('INSERT OR IGNORE INTO instance_staff (instanceId, staffId) VALUES (?, ?)').run(instId, staffId);
      });

      (inst.attendees || []).forEach(function (a) {
        db.prepare('INSERT OR IGNORE INTO instance_attendees (instanceId, youngPersonId, name, present) VALUES (?, ?, ?, ?)').run(
          instId, a.youngPersonId, a.name, a.present === null ? null : (a.present ? 1 : 0)
        );
      });
    });
  });
  insertEvent();

  res.status(201).json(getEventById(eventId));
});

// PUT /api/events/:id — update an event
router.put('/:id', function (req, res) {
  var existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });
  var data = req.body;
  db.prepare(`
    UPDATE events SET title=@title, description=@description, type=@type, venue=@venue,
    requiredStaff=@requiredStaff, maxAttendees=@maxAttendees, recurrence=@recurrence,
    ageGroup=@ageGroup, tags=@tags, isPublished=@isPublished, publishedAt=@publishedAt
    WHERE id=@id
  `).run({
    id: req.params.id,
    title: data.title !== undefined ? data.title : existing.title,
    description: data.description !== undefined ? data.description : existing.description,
    type: data.type !== undefined ? data.type : existing.type,
    venue: data.venue !== undefined ? data.venue : existing.venue,
    requiredStaff: data.requiredStaff !== undefined ? data.requiredStaff : existing.requiredStaff,
    maxAttendees: data.maxAttendees !== undefined ? data.maxAttendees : existing.maxAttendees,
    recurrence: data.recurrence !== undefined ? data.recurrence : existing.recurrence,
    ageGroup: data.ageGroup !== undefined ? data.ageGroup : existing.ageGroup,
    tags: data.tags !== undefined ? JSON.stringify(data.tags) : existing.tags,
    isPublished: data.isPublished !== undefined ? (data.isPublished ? 1 : 0) : existing.isPublished,
    publishedAt: data.publishedAt !== undefined ? data.publishedAt : existing.publishedAt,
  });
  res.json(getEventById(req.params.id));
});

// PATCH /api/events/:id/publish
router.patch('/:id/publish', function (req, res) {
  var existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });
  db.prepare('UPDATE events SET isPublished = 1, publishedAt = ? WHERE id = ?').run(new Date().toISOString(), req.params.id);
  res.json(getEventById(req.params.id));
});

// PATCH /api/events/:id/unpublish
router.patch('/:id/unpublish', function (req, res) {
  var existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });
  db.prepare('UPDATE events SET isPublished = 0, publishedAt = NULL WHERE id = ?').run(req.params.id);
  res.json(getEventById(req.params.id));
});

// ─── Instance-level routes ───────────────────────────────────────────────────

// GET /api/events/instances/:instanceId
router.get('/instances/:instanceId', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  res.json({ event: result.event, instance: result.instance });
});

// PATCH /api/events/instances/:instanceId/status
router.patch('/instances/:instanceId/status', function (req, res) {
  var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(req.params.instanceId);
  if (!inst) return res.status(404).json({ error: 'Instance not found.' });
  var { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be scheduled, completed, or cancelled.' });
  }
  db.prepare('UPDATE event_instances SET status = ? WHERE id = ?').run(status, req.params.instanceId);
  var result = findInstance(req.params.instanceId);
  res.json(result.instance);
});

// POST /api/events/instances/:instanceId/assign-staff
router.post('/instances/:instanceId/assign-staff', function (req, res) {
  var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(req.params.instanceId);
  if (!inst) return res.status(404).json({ error: 'Instance not found.' });
  var { staffId } = req.body;
  if (!staffId) return res.status(400).json({ error: 'staffId is required.' });

  var existing = db.prepare('SELECT * FROM instance_staff WHERE instanceId = ? AND staffId = ?').get(req.params.instanceId, staffId);
  if (existing) return res.status(409).json({ error: 'Staff already assigned to this instance.' });

  // Check shift conflicts
  var targetStart = inst.shiftStartTime || inst.startTime;
  var targetEnd = inst.shiftEndTime || inst.endTime;
  var conflicts = [];

  var otherInstances = db.prepare(`
    SELECT ei.*, e.title AS eventTitle FROM event_instances ei
    JOIN instance_staff is2 ON ei.id = is2.instanceId
    JOIN events e ON ei.eventId = e.id
    WHERE is2.staffId = ? AND ei.date = ? AND ei.id != ?
  `).all(staffId, inst.date, inst.id);

  otherInstances.forEach(function (other) {
    var otherStart = other.shiftStartTime || other.startTime;
    var otherEnd = other.shiftEndTime || other.endTime;
    if (targetStart < otherEnd && targetEnd > otherStart) {
      conflicts.push({
        staffId: staffId,
        conflictingEventTitle: other.eventTitle,
        conflictDate: other.date,
        conflictTime: otherStart + '–' + otherEnd,
      });
    }
  });

  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'Shift conflict detected.', conflicts: conflicts });
  }

  db.prepare('INSERT INTO instance_staff (instanceId, staffId) VALUES (?, ?)').run(req.params.instanceId, staffId);
  var result = findInstance(req.params.instanceId);
  res.json(result.instance);
});

// DELETE /api/events/instances/:instanceId/assign-staff/:staffId
router.delete('/instances/:instanceId/assign-staff/:staffId', function (req, res) {
  db.prepare('DELETE FROM instance_staff WHERE instanceId = ? AND staffId = ?').run(req.params.instanceId, req.params.staffId);
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  res.json(result.instance);
});

// PATCH /api/events/instances/:instanceId/attendance
router.patch('/instances/:instanceId/attendance', function (req, res) {
  var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(req.params.instanceId);
  if (!inst) return res.status(404).json({ error: 'Instance not found.' });
  var { attendeeId, present } = req.body;
  if (!attendeeId || present === undefined) {
    return res.status(400).json({ error: 'attendeeId and present are required.' });
  }
  var att = db.prepare('SELECT * FROM instance_attendees WHERE instanceId = ? AND youngPersonId = ?').get(req.params.instanceId, attendeeId);
  if (!att) return res.status(404).json({ error: 'Attendee not found in this instance.' });
  db.prepare('UPDATE instance_attendees SET present = ? WHERE instanceId = ? AND youngPersonId = ?').run(present ? 1 : 0, req.params.instanceId, attendeeId);
  var result = findInstance(req.params.instanceId);
  res.json(result.instance);
});

// POST /api/events/instances/:instanceId/save-attendance
router.post('/instances/:instanceId/save-attendance', function (req, res) {
  var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(req.params.instanceId);
  if (!inst) return res.status(404).json({ error: 'Instance not found.' });
  db.prepare('UPDATE event_instances SET status = ? WHERE id = ?').run('completed', req.params.instanceId);
  var result = findInstance(req.params.instanceId);
  res.json(result.instance);
});

// POST /api/events/instances/book — book sessions for a young person
router.post('/instances/book', function (req, res) {
  var { userId, instanceIds, name, email, phone } = req.body;
  if (!userId || !instanceIds || !instanceIds.length) {
    return res.status(400).json({ error: 'userId and instanceIds are required.' });
  }

  var booked = [];
  var uniqueIds = Array.from(new Set(instanceIds));

  var bookTxn = db.transaction(function () {
    uniqueIds.forEach(function (instanceId) {
      var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(instanceId);
      if (!inst) return;
      var existing = db.prepare('SELECT * FROM instance_attendees WHERE instanceId = ? AND youngPersonId = ?').get(instanceId, userId);
      if (!existing) {
        db.prepare('INSERT INTO instance_attendees (instanceId, youngPersonId, name, present) VALUES (?, ?, ?, ?)').run(
          instanceId, userId, name || userId, null
        );
        booked.push(instanceId);
      }
    });
  });
  bookTxn();

  res.json({ success: true, booked: booked, message: 'Sessions booked successfully.' });
});

module.exports = router;
