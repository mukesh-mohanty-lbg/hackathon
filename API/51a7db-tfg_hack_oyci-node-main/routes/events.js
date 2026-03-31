var express = require('express');
var router = express.Router();

var { EVENTS } = require('../data/mockData');

// In-memory store (seeded from mock data)
var events = JSON.parse(JSON.stringify(EVENTS));

// GET /api/events — list all events (optional ?type=workshop&published=true)
router.get('/', function (req, res) {
  var result = events;
  if (req.query.type) {
    result = result.filter(function (e) { return e.type === req.query.type; });
  }
  if (req.query.published !== undefined) {
    var isPublished = req.query.published === 'true';
    result = result.filter(function (e) { return !!e.isPublished === isPublished; });
  }
  res.json(result);
});

// GET /api/events/:id
router.get('/:id', function (req, res) {
  var event = events.find(function (e) { return e.id === req.params.id; });
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  res.json(event);
});

// POST /api/events — create a new event
router.post('/', function (req, res) {
  var data = req.body;
  if (!data.title || !data.type || !data.venue) {
    return res.status(400).json({ error: 'title, type, and venue are required.' });
  }
  var newEvent = Object.assign({}, data, {
    id: 'e' + Date.now(),
    createdAt: new Date().toISOString().split('T')[0],
    instances: data.instances || [],
  });
  events.push(newEvent);
  res.status(201).json(newEvent);
});

// PUT /api/events/:id — update an event
router.put('/:id', function (req, res) {
  var idx = events.findIndex(function (e) { return e.id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Event not found.' });
  events[idx] = Object.assign({}, events[idx], req.body);
  res.json(events[idx]);
});

// PATCH /api/events/:id/publish
router.patch('/:id/publish', function (req, res) {
  var event = events.find(function (e) { return e.id === req.params.id; });
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  event.isPublished = true;
  event.publishedAt = new Date().toISOString();
  res.json(event);
});

// PATCH /api/events/:id/unpublish
router.patch('/:id/unpublish', function (req, res) {
  var event = events.find(function (e) { return e.id === req.params.id; });
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  event.isPublished = false;
  event.publishedAt = undefined;
  res.json(event);
});

// ─── Instance-level routes ───────────────────────────────────────────────────

// Helper: find instance across all events
function findInstance(instanceId) {
  for (var i = 0; i < events.length; i++) {
    var inst = events[i].instances.find(function (ins) { return ins.id === instanceId; });
    if (inst) return { event: events[i], instance: inst };
  }
  return null;
}

// GET /api/events/instances/:instanceId
router.get('/instances/:instanceId', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  res.json({ event: result.event, instance: result.instance });
});

// PATCH /api/events/instances/:instanceId/status
router.patch('/instances/:instanceId/status', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  var { status } = req.body;
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be scheduled, completed, or cancelled.' });
  }
  result.instance.status = status;
  res.json(result.instance);
});

// POST /api/events/instances/:instanceId/assign-staff
router.post('/instances/:instanceId/assign-staff', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  var { staffId } = req.body;
  if (!staffId) return res.status(400).json({ error: 'staffId is required.' });
  if (result.instance.staffAssigned.includes(staffId)) {
    return res.status(409).json({ error: 'Staff already assigned to this instance.' });
  }

  // Check for shift conflicts
  var targetInst = result.instance;
  var targetStart = targetInst.shiftStartTime || targetInst.startTime;
  var targetEnd = targetInst.shiftEndTime || targetInst.endTime;
  var conflicts = [];

  events.forEach(function (ev) {
    ev.instances.forEach(function (inst) {
      if (inst.id === targetInst.id) return;
      if (inst.date !== targetInst.date) return;
      if (!inst.staffAssigned.includes(staffId)) return;
      var instStart = inst.shiftStartTime || inst.startTime;
      var instEnd = inst.shiftEndTime || inst.endTime;
      if (targetStart < instEnd && targetEnd > instStart) {
        conflicts.push({
          staffId: staffId,
          conflictingEventTitle: ev.title,
          conflictDate: inst.date,
          conflictTime: instStart + '–' + instEnd,
        });
      }
    });
  });

  if (conflicts.length > 0) {
    return res.status(409).json({ error: 'Shift conflict detected.', conflicts: conflicts });
  }

  result.instance.staffAssigned.push(staffId);
  res.json(result.instance);
});

// DELETE /api/events/instances/:instanceId/assign-staff/:staffId
router.delete('/instances/:instanceId/assign-staff/:staffId', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  result.instance.staffAssigned = result.instance.staffAssigned.filter(function (s) {
    return s !== req.params.staffId;
  });
  res.json(result.instance);
});

// PATCH /api/events/instances/:instanceId/attendance
router.patch('/instances/:instanceId/attendance', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  var { attendeeId, present } = req.body;
  if (!attendeeId || present === undefined) {
    return res.status(400).json({ error: 'attendeeId and present are required.' });
  }
  var attendee = result.instance.attendees.find(function (a) { return a.youngPersonId === attendeeId; });
  if (!attendee) return res.status(404).json({ error: 'Attendee not found in this instance.' });
  attendee.present = present;
  res.json(result.instance);
});

// POST /api/events/instances/:instanceId/save-attendance
router.post('/instances/:instanceId/save-attendance', function (req, res) {
  var result = findInstance(req.params.instanceId);
  if (!result) return res.status(404).json({ error: 'Instance not found.' });
  result.instance.status = 'completed';
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

  uniqueIds.forEach(function (instanceId) {
    var result = findInstance(instanceId);
    if (!result) return;
    var alreadyBooked = result.instance.attendees.some(function (a) { return a.youngPersonId === userId; });
    if (!alreadyBooked) {
      result.instance.attendees.push({ youngPersonId: userId, name: name || userId, present: null });
      booked.push(instanceId);
    }
  });

  res.json({ success: true, booked: booked, message: 'Sessions booked successfully.' });
});

module.exports = router;
module.exports._store = events;
