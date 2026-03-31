var Database = require('better-sqlite3');
var path = require('path');

var DB_PATH = path.join(__dirname, 'oyci.db');
var db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    phone TEXT,
    availability TEXT DEFAULT 'available',
    availabilityNote TEXT,
    isActive INTEGER DEFAULT 1,
    joinedDate TEXT,
    payType TEXT,
    contractedHours REAL,
    workingDays TEXT -- JSON array
  );

  CREATE TABLE IF NOT EXISTS credentials (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    venue TEXT NOT NULL,
    requiredStaff INTEGER DEFAULT 1,
    maxAttendees INTEGER DEFAULT 20,
    recurrence TEXT DEFAULT 'none',
    ageGroup TEXT,
    tags TEXT, -- JSON array
    createdBy TEXT,
    createdAt TEXT,
    isPublished INTEGER DEFAULT 0,
    publishedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS event_instances (
    id TEXT PRIMARY KEY,
    eventId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    shiftStartTime TEXT,
    shiftEndTime TEXT,
    venueOverride TEXT,
    maxAttendees INTEGER DEFAULT 20,
    status TEXT DEFAULT 'scheduled',
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS instance_staff (
    instanceId TEXT NOT NULL,
    staffId TEXT NOT NULL,
    PRIMARY KEY (instanceId, staffId),
    FOREIGN KEY (instanceId) REFERENCES event_instances(id) ON DELETE CASCADE,
    FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS instance_attendees (
    instanceId TEXT NOT NULL,
    youngPersonId TEXT NOT NULL,
    name TEXT NOT NULL,
    present INTEGER, -- null=pending, 1=true, 0=false
    PRIMARY KEY (instanceId, youngPersonId),
    FOREIGN KEY (instanceId) REFERENCES event_instances(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS availability_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staffId TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    isFullDay INTEGER DEFAULT 1,
    startTime TEXT,
    endTime TEXT,
    note TEXT,
    FOREIGN KEY (staffId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convert a DB user row to the API shape
function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || undefined,
    availability: row.availability,
    availabilityNote: row.availabilityNote || undefined,
    isActive: !!row.isActive,
    joinedDate: row.joinedDate,
    payType: row.payType || undefined,
    contractedHours: row.contractedHours || undefined,
    workingDays: row.workingDays ? JSON.parse(row.workingDays) : undefined,
  };
}

// Build a full event object with nested instances, staff, attendees
function getFullEvent(eventRow) {
  if (!eventRow) return null;
  var instances = db.prepare('SELECT * FROM event_instances WHERE eventId = ?').all(eventRow.id);
  instances = instances.map(function (inst) {
    var staff = db.prepare('SELECT staffId FROM instance_staff WHERE instanceId = ?').all(inst.id);
    var attendees = db.prepare('SELECT * FROM instance_attendees WHERE instanceId = ?').all(inst.id);
    return {
      id: inst.id,
      eventId: inst.eventId,
      date: inst.date,
      startTime: inst.startTime,
      endTime: inst.endTime,
      shiftStartTime: inst.shiftStartTime || undefined,
      shiftEndTime: inst.shiftEndTime || undefined,
      venueOverride: inst.venueOverride || undefined,
      maxAttendees: inst.maxAttendees,
      status: inst.status,
      staffAssigned: staff.map(function (s) { return s.staffId; }),
      attendees: attendees.map(function (a) {
        return {
          youngPersonId: a.youngPersonId,
          name: a.name,
          present: a.present === null ? null : !!a.present,
        };
      }),
    };
  });

  return {
    id: eventRow.id,
    title: eventRow.title,
    description: eventRow.description,
    type: eventRow.type,
    venue: eventRow.venue,
    requiredStaff: eventRow.requiredStaff,
    maxAttendees: eventRow.maxAttendees,
    recurrence: eventRow.recurrence,
    ageGroup: eventRow.ageGroup || undefined,
    tags: eventRow.tags ? JSON.parse(eventRow.tags) : [],
    createdBy: eventRow.createdBy,
    createdAt: eventRow.createdAt,
    isPublished: !!eventRow.isPublished,
    publishedAt: eventRow.publishedAt || undefined,
    instances: instances,
  };
}

function getAllEvents() {
  var rows = db.prepare('SELECT * FROM events').all();
  return rows.map(getFullEvent);
}

function getEventById(id) {
  var row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  return getFullEvent(row);
}

function findInstance(instanceId) {
  var inst = db.prepare('SELECT * FROM event_instances WHERE id = ?').get(instanceId);
  if (!inst) return null;
  var eventRow = db.prepare('SELECT * FROM events WHERE id = ?').get(inst.eventId);
  return { event: getFullEvent(eventRow), instance: getFullEvent(eventRow).instances.find(function (i) { return i.id === instanceId; }) };
}

module.exports = {
  db: db,
  rowToUser: rowToUser,
  getFullEvent: getFullEvent,
  getAllEvents: getAllEvents,
  getEventById: getEventById,
  findInstance: findInstance,
};
