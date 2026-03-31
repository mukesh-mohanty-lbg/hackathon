var express = require('express');
var router = express.Router();

var { USERS, EVENTS, AVAILABILITY_OVERRIDES } = require('../data/mockData');

// References to the live in-memory stores (populated by other route modules)
// We lazily bind to the events/users/overrides arrays from the app
var _users, _events, _overrides;

function getUsers() {
  if (!_users) _users = require('./users')._store;
  return _users || JSON.parse(JSON.stringify(USERS));
}

// Since events.js and availability.js keep their own in-memory copies,
// we import them directly for cross-module reads.
router.use(function (req, res, next) {
  // Attach shared stores from sibling routes via app.locals
  req._events = req.app.locals.eventsStore;
  req._users = req.app.locals.usersStore;
  req._overrides = req.app.locals.overridesStore;
  next();
});

// GET /api/staff/:staffId/status?instanceId=INSTANCE_ID
//   Returns { status: 'free'|'conflict'|'unavailable', conflicts?: [] }
router.get('/:staffId/status', function (req, res) {
  var staffId = req.params.staffId;
  var instanceId = req.query.instanceId;
  var date = req.query.date;
  var users = req._users;
  var events = req._events;
  var overrides = req._overrides;

  var user = users.find(function (u) { return u.id === staffId; });
  if (!user || !user.isActive) {
    return res.json({ status: 'unavailable' });
  }

  // Instance-level check
  if (instanceId) {
    var targetInst = null;
    var targetEvent = null;
    for (var i = 0; i < events.length; i++) {
      var inst = events[i].instances.find(function (ins) { return ins.id === instanceId; });
      if (inst) { targetInst = inst; targetEvent = events[i]; break; }
    }
    if (!targetInst) return res.status(404).json({ error: 'Instance not found.' });

    // Check override for that date
    var dayOverride = overrides.find(function (o) {
      return o.staffId === staffId && o.date === targetInst.date && o.status === 'unavailable';
    });
    if (dayOverride) return res.json({ status: 'unavailable' });

    // Check global unavailability
    if (user.availability === 'unavailable') return res.json({ status: 'unavailable' });

    // Check shift overlaps
    var targetStart = targetInst.shiftStartTime || targetInst.startTime;
    var targetEnd = targetInst.shiftEndTime || targetInst.endTime;
    var conflicts = [];

    events.forEach(function (ev) {
      ev.instances.forEach(function (inst2) {
        if (inst2.id === instanceId) return;
        if (inst2.date !== targetInst.date) return;
        if (!inst2.staffAssigned.includes(staffId)) return;
        var instStart = inst2.shiftStartTime || inst2.startTime;
        var instEnd = inst2.shiftEndTime || inst2.endTime;
        if (targetStart < instEnd && targetEnd > instStart) {
          conflicts.push({
            staffId: staffId,
            staffName: user.name,
            conflictingEventTitle: ev.title,
            conflictDate: inst2.date,
            conflictTime: instStart + '–' + instEnd,
          });
        }
      });
    });

    if (conflicts.length > 0) {
      return res.json({ status: 'conflict', conflicts: conflicts });
    }
    return res.json({ status: 'free' });
  }

  // Day-level check
  if (date) {
    var dayOvr = overrides.find(function (o) {
      return o.staffId === staffId && o.date === date && o.status === 'unavailable';
    });
    if (dayOvr) return res.json({ status: 'unavailable' });
    if (user.availability === 'unavailable') return res.json({ status: 'unavailable' });

    // Find all assigned instances on this date
    var assignedOnDay = [];
    events.forEach(function (ev) {
      ev.instances.forEach(function (inst3) {
        if (inst3.staffAssigned.includes(staffId) && inst3.date === date && inst3.status === 'scheduled') {
          assignedOnDay.push(inst3);
        }
      });
    });

    // Check if any two overlap
    for (var a = 0; a < assignedOnDay.length; a++) {
      for (var b = a + 1; b < assignedOnDay.length; b++) {
        var aStart = assignedOnDay[a].shiftStartTime || assignedOnDay[a].startTime;
        var aEnd = assignedOnDay[a].shiftEndTime || assignedOnDay[a].endTime;
        var bStart = assignedOnDay[b].shiftStartTime || assignedOnDay[b].startTime;
        var bEnd = assignedOnDay[b].shiftEndTime || assignedOnDay[b].endTime;
        if (aStart < bEnd && aEnd > bStart) {
          return res.json({ status: 'conflict', assignedInstances: assignedOnDay });
        }
      }
    }

    return res.json({ status: 'free', assignedInstances: assignedOnDay });
  }

  return res.status(400).json({ error: 'Provide either instanceId or date query parameter.' });
});

// GET /api/staff/:staffId/availability-overrides
router.get('/:staffId/availability-overrides', function (req, res) {
  var overrides = req._overrides;
  var result = overrides.filter(function (o) { return o.staffId === req.params.staffId; });
  if (req.query.dateFrom) {
    result = result.filter(function (o) { return o.date >= req.query.dateFrom; });
  }
  if (req.query.dateTo) {
    result = result.filter(function (o) { return o.date <= req.query.dateTo; });
  }
  res.json(result);
});

module.exports = router;
