var express = require('express');
var router = express.Router();

var { AVAILABILITY_OVERRIDES } = require('../data/mockData');

// In-memory store (seeded from mock data)
var overrides = JSON.parse(JSON.stringify(AVAILABILITY_OVERRIDES));

// GET /api/availability — list all overrides (optional ?staffId=u3&date=2026-04-02&dateFrom=&dateTo=)
router.get('/', function (req, res) {
  var result = overrides;
  if (req.query.staffId) {
    result = result.filter(function (o) { return o.staffId === req.query.staffId; });
  }
  if (req.query.date) {
    result = result.filter(function (o) { return o.date === req.query.date; });
  }
  if (req.query.dateFrom) {
    result = result.filter(function (o) { return o.date >= req.query.dateFrom; });
  }
  if (req.query.dateTo) {
    result = result.filter(function (o) { return o.date <= req.query.dateTo; });
  }
  res.json(result);
});

// POST /api/availability — create or update an override
router.post('/', function (req, res) {
  var override = req.body;
  if (!override.staffId || !override.date || !override.status) {
    return res.status(400).json({ error: 'staffId, date, and status are required.' });
  }

  var isFullDay = override.isFullDay !== false && !override.startTime && !override.endTime;

  if (isFullDay) {
    // Remove any existing full-day override for this staff+date
    overrides = overrides.filter(function (o) {
      var otherIsFullDay = o.isFullDay !== false && !o.startTime && !o.endTime;
      return !(o.staffId === override.staffId && o.date === override.date && otherIsFullDay);
    });
    override.isFullDay = true;
    delete override.startTime;
    delete override.endTime;
  } else {
    // Remove matching time-specific override
    overrides = overrides.filter(function (o) {
      return !(
        o.staffId === override.staffId
        && o.date === override.date
        && o.startTime === override.startTime
        && o.endTime === override.endTime
      );
    });
    override.isFullDay = false;
  }

  overrides.push(override);
  res.status(201).json(override);
});

// DELETE /api/availability — remove an override
router.delete('/', function (req, res) {
  var { staffId, date } = req.body;
  if (!staffId || !date) {
    return res.status(400).json({ error: 'staffId and date are required.' });
  }
  var before = overrides.length;
  overrides = overrides.filter(function (o) {
    return !(o.staffId === staffId && o.date === date);
  });
  res.json({ removed: before - overrides.length });
});

module.exports = router;
module.exports._getStore = function () { return overrides; };
