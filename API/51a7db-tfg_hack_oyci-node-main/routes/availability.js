var express = require('express');
var router = express.Router();

var { db } = require('../data/db');

function rowToOverride(row) {
  return {
    staffId: row.staffId,
    date: row.date,
    status: row.status,
    isFullDay: !!row.isFullDay,
    startTime: row.startTime || undefined,
    endTime: row.endTime || undefined,
    note: row.note || undefined,
  };
}

// GET /api/availability — list all overrides (optional ?staffId=u3&date=2026-04-02&dateFrom=&dateTo=)
router.get('/', function (req, res) {
  var clauses = [];
  var params = {};
  if (req.query.staffId) {
    clauses.push('staffId = @staffId');
    params.staffId = req.query.staffId;
  }
  if (req.query.date) {
    clauses.push('date = @date');
    params.date = req.query.date;
  }
  if (req.query.dateFrom) {
    clauses.push('date >= @dateFrom');
    params.dateFrom = req.query.dateFrom;
  }
  if (req.query.dateTo) {
    clauses.push('date <= @dateTo');
    params.dateTo = req.query.dateTo;
  }
  var sql = 'SELECT * FROM availability_overrides' + (clauses.length ? ' WHERE ' + clauses.join(' AND ') : '');
  var rows = db.prepare(sql).all(params);
  res.json(rows.map(rowToOverride));
});

// POST /api/availability — create or update an override
router.post('/', function (req, res) {
  var override = req.body;
  if (!override.staffId || !override.date || !override.status) {
    return res.status(400).json({ error: 'staffId, date, and status are required.' });
  }

  var isFullDay = override.isFullDay !== false && !override.startTime && !override.endTime;

  if (isFullDay) {
    // Remove existing full-day override for this staff+date
    db.prepare('DELETE FROM availability_overrides WHERE staffId = ? AND date = ? AND isFullDay = 1').run(override.staffId, override.date);
  } else {
    // Remove matching time-specific override
    db.prepare('DELETE FROM availability_overrides WHERE staffId = ? AND date = ? AND startTime = ? AND endTime = ?').run(
      override.staffId, override.date, override.startTime, override.endTime
    );
  }

  db.prepare(`
    INSERT INTO availability_overrides (staffId, date, status, isFullDay, startTime, endTime, note)
    VALUES (@staffId, @date, @status, @isFullDay, @startTime, @endTime, @note)
  `).run({
    staffId: override.staffId,
    date: override.date,
    status: override.status,
    isFullDay: isFullDay ? 1 : 0,
    startTime: isFullDay ? null : (override.startTime || null),
    endTime: isFullDay ? null : (override.endTime || null),
    note: override.note || null,
  });

  res.status(201).json(rowToOverride({
    staffId: override.staffId,
    date: override.date,
    status: override.status,
    isFullDay: isFullDay ? 1 : 0,
    startTime: isFullDay ? null : override.startTime,
    endTime: isFullDay ? null : override.endTime,
    note: override.note || null,
  }));
});

// DELETE /api/availability — remove an override
router.delete('/', function (req, res) {
  var { staffId, date } = req.body;
  if (!staffId || !date) {
    return res.status(400).json({ error: 'staffId and date are required.' });
  }
  var info = db.prepare('DELETE FROM availability_overrides WHERE staffId = ? AND date = ?').run(staffId, date);
  res.json({ removed: info.changes });
});

module.exports = router;
module.exports._getStore = function () { return overrides; };
