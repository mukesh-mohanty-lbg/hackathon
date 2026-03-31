var { db } = require('./db');
var { USERS, CREDENTIALS, EVENTS, AVAILABILITY_OVERRIDES } = require('./mockData');

console.log('Seeding database...');

// Clear existing data (order matters for foreign keys)
db.exec('DELETE FROM instance_attendees');
db.exec('DELETE FROM instance_staff');
db.exec('DELETE FROM event_instances');
db.exec('DELETE FROM availability_overrides');
db.exec('DELETE FROM events');
db.exec('DELETE FROM credentials');
db.exec('DELETE FROM users');

// ─── Seed users ──────────────────────────────────────────────────────────────
var insertUser = db.prepare(`
  INSERT INTO users (id, name, email, role, phone, availability, availabilityNote, isActive, joinedDate, payType, contractedHours, workingDays)
  VALUES (@id, @name, @email, @role, @phone, @availability, @availabilityNote, @isActive, @joinedDate, @payType, @contractedHours, @workingDays)
`);

var seedUsers = db.transaction(function () {
  USERS.forEach(function (u) {
    insertUser.run({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || null,
      availability: u.availability || 'available',
      availabilityNote: u.availabilityNote || null,
      isActive: u.isActive ? 1 : 0,
      joinedDate: u.joinedDate || null,
      payType: u.payType || null,
      contractedHours: u.contractedHours || null,
      workingDays: u.workingDays ? JSON.stringify(u.workingDays) : null,
    });
  });
});
seedUsers();
console.log('  ✓ ' + USERS.length + ' users');

// ─── Seed credentials ────────────────────────────────────────────────────────
var insertCred = db.prepare('INSERT INTO credentials (email, password) VALUES (?, ?)');
var seedCreds = db.transaction(function () {
  Object.entries(CREDENTIALS).forEach(function (entry) {
    insertCred.run(entry[0], entry[1]);
  });
});
seedCreds();
console.log('  ✓ ' + Object.keys(CREDENTIALS).length + ' credentials');

// ─── Seed events, instances, staff, attendees ────────────────────────────────
var insertEvent = db.prepare(`
  INSERT INTO events (id, title, description, type, venue, requiredStaff, maxAttendees, recurrence, ageGroup, tags, createdBy, createdAt, isPublished, publishedAt)
  VALUES (@id, @title, @description, @type, @venue, @requiredStaff, @maxAttendees, @recurrence, @ageGroup, @tags, @createdBy, @createdAt, @isPublished, @publishedAt)
`);

var insertInstance = db.prepare(`
  INSERT INTO event_instances (id, eventId, date, startTime, endTime, shiftStartTime, shiftEndTime, venueOverride, maxAttendees, status)
  VALUES (@id, @eventId, @date, @startTime, @endTime, @shiftStartTime, @shiftEndTime, @venueOverride, @maxAttendees, @status)
`);

var insertStaff = db.prepare('INSERT INTO instance_staff (instanceId, staffId) VALUES (?, ?)');
var insertAttendee = db.prepare('INSERT INTO instance_attendees (instanceId, youngPersonId, name, present) VALUES (?, ?, ?, ?)');

var seedEvents = db.transaction(function () {
  var instanceCount = 0;
  EVENTS.forEach(function (e) {
    insertEvent.run({
      id: e.id,
      title: e.title,
      description: e.description || null,
      type: e.type,
      venue: e.venue,
      requiredStaff: e.requiredStaff || 1,
      maxAttendees: e.maxAttendees || 20,
      recurrence: e.recurrence || 'none',
      ageGroup: e.ageGroup || null,
      tags: e.tags ? JSON.stringify(e.tags) : null,
      createdBy: e.createdBy || null,
      createdAt: e.createdAt || null,
      isPublished: e.isPublished ? 1 : 0,
      publishedAt: e.publishedAt || null,
    });

    (e.instances || []).forEach(function (inst) {
      insertInstance.run({
        id: inst.id,
        eventId: e.id,
        date: inst.date,
        startTime: inst.startTime,
        endTime: inst.endTime,
        shiftStartTime: inst.shiftStartTime || null,
        shiftEndTime: inst.shiftEndTime || null,
        venueOverride: inst.venueOverride || null,
        maxAttendees: inst.maxAttendees || e.maxAttendees || 20,
        status: inst.status || 'scheduled',
      });

      (inst.staffAssigned || []).forEach(function (staffId) {
        insertStaff.run(inst.id, staffId);
      });

      (inst.attendees || []).forEach(function (a) {
        var presentVal = a.present === null ? null : (a.present ? 1 : 0);
        insertAttendee.run(inst.id, a.youngPersonId, a.name, presentVal);
      });

      instanceCount++;
    });
  });
  console.log('  ✓ ' + EVENTS.length + ' events, ' + instanceCount + ' instances');
});
seedEvents();

// ─── Seed availability overrides ─────────────────────────────────────────────
var insertOverride = db.prepare(`
  INSERT INTO availability_overrides (staffId, date, status, isFullDay, startTime, endTime, note)
  VALUES (@staffId, @date, @status, @isFullDay, @startTime, @endTime, @note)
`);

var seedOverrides = db.transaction(function () {
  AVAILABILITY_OVERRIDES.forEach(function (o) {
    insertOverride.run({
      staffId: o.staffId,
      date: o.date,
      status: o.status,
      isFullDay: o.isFullDay !== undefined ? (o.isFullDay ? 1 : 0) : 1,
      startTime: o.startTime || null,
      endTime: o.endTime || null,
      note: o.note || null,
    });
  });
});
seedOverrides();
console.log('  ✓ ' + AVAILABILITY_OVERRIDES.length + ' availability overrides');

console.log('Seed complete!');
