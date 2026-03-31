var express = require('express');
var router = express.Router();

var { db, rowToUser } = require('../data/db');

// GET /api/staff/:staffId/status?instanceId=INSTANCE_ID
//   Returns { status: 'free'|'conflict'|'unavailable', conflicts?: [] }
router.get('/:staffId/status', function (req, res) {
  var staffId = req.params.staffId;
  var instanceId = req.query.instanceId;
  var date = req.query.date;

  var userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(staffId);
  var user = rowToUser(userRow);
  if (!user || !user.isActive) {
    return res.json({ status: 'unavailable' });
  }

  // Instance-level check
  if (instanceId) {
    var targetInst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(instanceId);
    if (!targetInst) return res.status(404).json({ error: 'Instance not found.' });

    // Check override for that date
    var dayOverride = db.prepare('SELECT * FROM availability_overrides WHERE staffId = ? AND date = ? AND status = ?').get(staffId, targetInst.date, 'unavailable');
    if (dayOverride) return res.json({ status: 'unavailable' });

    // Check global unavailability
    if (user.availability === 'unavailable') return res.json({ status: 'unavailable' });

    // Check shift overlaps with SQL
    var targetStart = targetInst.shiftStartTime || targetInst.startTime;
    var targetEnd = targetInst.shiftEndTime || targetInst.endTime;

    var otherInstances = db.prepare(`
      SELECT ei.*, e.title AS eventTitle FROM event_instances ei
      JOIN instance_staff is2 ON ei.id = is2.instanceId
      JOIN events e ON ei.eventId = e.id
      WHERE is2.staffId = ? AND ei.date = ? AND ei.id != ?
    `).all(staffId, targetInst.date, instanceId);

    var conflicts = [];
    otherInstances.forEach(function (other) {
      var otherStart = other.shiftStartTime || other.startTime;
      var otherEnd = other.shiftEndTime || other.endTime;
      if (targetStart < otherEnd && targetEnd > otherStart) {
        conflicts.push({
          staffId: staffId,
          staffName: user.name,
          conflictingEventTitle: other.eventTitle,
          conflictDate: other.date,
          conflictTime: otherStart + '–' + otherEnd,
        });
      }
    });

    if (conflicts.length > 0) {
      return res.json({ status: 'conflict', conflicts: conflicts });
    }
    return res.json({ status: 'free' });
  }

  // Day-level check
  if (date) {
    var dayOvr = db.prepare('SELECT * FROM availability_overrides WHERE staffId = ? AND date = ? AND status = ?').get(staffId, date, 'unavailable');
    if (dayOvr) return res.json({ status: 'unavailable' });
    if (user.availability === 'unavailable') return res.json({ status: 'unavailable' });

    // Find all assigned instances on this date
    var assignedOnDay = db.prepare(`
      SELECT ei.* FROM event_instances ei
      JOIN instance_staff is2 ON ei.id = is2.instanceId
      WHERE is2.staffId = ? AND ei.date = ? AND ei.status = 'scheduled'
    `).all(staffId, date);

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
  var clauses = ['staffId = @staffId'];
  var params = { staffId: req.params.staffId };
  if (req.query.dateFrom) {
    clauses.push('date >= @dateFrom');
    params.dateFrom = req.query.dateFrom;
  }
  if (req.query.dateTo) {
    clauses.push('date <= @dateTo');
    params.dateTo = req.query.dateTo;
  }
  var rows = db.prepare('SELECT * FROM availability_overrides WHERE ' + clauses.join(' AND ')).all(params);
  res.json(rows.map(function (r) {
    return { staffId: r.staffId, date: r.date, status: r.status, isFullDay: !!r.isFullDay, startTime: r.startTime || undefined, endTime: r.endTime || undefined, note: r.note || undefined };
  }));
});

module.exports = router;
