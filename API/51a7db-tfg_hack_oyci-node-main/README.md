# OYCI Backend API

Express + SQLite3 backend for the OYCI youth events management platform.

---

## API Documentation

### 1. **package.json**
**Scripts:**
- `start`: `node ./bin/www` (starts server)
- `seed`: `node ./data/seed.js` (populates database)

**Dependencies:**
- `bcryptjs` ^3.0.3 — password hashing
- `better-sqlite3` ^12.8.0 — embedded SQLite database
- `cookie-parser` ~1.4.4 — cookie middleware
- `cors` ^2.8.6 — CORS handling
- `debug` ~2.6.9 — logging
- `dotenv` ^17.3.1 — environment variables
- `express` ~4.16.1 — web framework
- `http-errors` ~1.6.3 — error handling
- `jade` ~1.11.0 — template engine (unused in API context)
- `jsonwebtoken` ^9.0.3 — JWT token generation/verification
- `morgan` ~1.9.1 — HTTP request logging

---

### 2. **app.js** — Express Application Setup

**Middleware Stack:**
```
CORS (no restrictions) → Morgan logging ('dev') → JSON body parser → 
URL-encoded parser (extended: false) → Cookie parser → Static files (/public)
```

**CORS Configuration:** Fully open (`app.use(cors())` with no options = allow all origins)

**Route Mounting:**
- `GET /` → indexRouter
- `/api/auth/*` → authRouter
- `/api/users/*` → usersRouter
- `/api/events/*` → eventsRouter
- `/api/availability/*` → availabilityRouter
- `/api/staff/*` → staffRouter

**Error Handling:**
- 404 handler converts unmatched routes to `createError(404)`
- Global error handler renders error view; shows stack trace in development only

---

### 3. **bin/www** — Server Startup
- **Port:** `process.env.PORT` or `3000` (default)
- **Server type:** HTTP (not HTTPS)
- **Error handlers:** EACCES (elevated privileges needed), EADDRINUSE (port in use)
- **Startup logging:** Via `debug` module to `ochil-node:server` namespace

---

### 4. **data/db.js** — Database Configuration & Schema

**Database File Location:** `data/oyci.db` (relative to the `data/` directory, SQLite3, WAL mode enabled)

**Pragmas Enabled:**
- `journal_mode = WAL` — Write-Ahead Logging for concurrent reads
- `foreign_keys = ON` — Enforce referential integrity

**Schema:**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Staff/individual user directory | `id` (PK), `email` (UNIQUE), `role`, `availability`, `isActive`, `contractedHours`, `workingDays` (JSON) |
| `credentials` | Login credentials | `email` (PK), `password` (plaintext stored) |
| `events` | Event master records | `id` (PK), `title`, `type`, `venue`, `requiredStaff`, `recurrence`, `tags` (JSON), `isPublished`, `publishedAt` |
| `event_instances` | Individual event occurrences | `id` (PK), `eventId` (FK), `date`, `startTime`, `endTime`, `shiftStartTime`, `shiftEndTime`, `venueOverride`, `status` |
| `instance_staff` | Staff assignments to instances | `instanceId + staffId` (composite PK), FKs on cascade delete |
| `instance_attendees` | Young person attendance tracking | `instanceId + youngPersonId` (composite PK), `present` (null=pending, 1=true, 0=false) |
| `availability_overrides` | Staff availability exceptions | `id`, `staffId` (FK), `date`, `status`, `isFullDay`, `startTime`, `endTime`, `note` |

**Helper Functions:**
- `rowToUser()` — Converts DB row to API shape (parses JSON fields, converts booleans)
- `getFullEvent(eventId)` — Returns complete event with nested instances, staff, attendees
- `getAllEvents()` — Returns all events with full detail
- `getEventById(id)` — Returns single event with full detail
- `findInstance(instanceId)` — Returns instance with parent event context

---

### 5. **data/seed.js** — Database Seeding

**Seeding Process:**
1. **Clears all data** in reverse FK order (attendees → staff → instances → overrides → events → credentials → users)
2. **Inserts users**: 7 users from mockData.USERS as transaction
3. **Inserts credentials**: Email/password pairs from mockData.CREDENTIALS
4. **Inserts events + instances + staff + attendees**: Nested transaction processing
   - Parses JSON fields (`workingDays`, `tags`)
   - Converts boolean `present` to 0/1
5. **Inserts availability overrides**: From mockData.AVAILABILITY_OVERRIDES

**Transaction Usage:** Uses `db.transaction()` wrapper for atomic operations

---

### 6. **data/mockData.js** — Test Data Structure

**Users (7 total):**
- `u1`: Sarah Mitchell (admin@oyci.org.uk) — admin, salaried, 37 hrs/week
- `u2`: Jamie Robertson (staff@oyci.org.uk) — staff, salaried, 35 hrs/week
- `u3`: Priya Sharma (priya@oyci.org.uk) — staff, hourly, 20 hrs/week, **partial availability** mornings only
- `u4`: Callum Baxter (callum@oyci.org.uk) — staff, fixed-term, 30 hrs/week, **unavailable until 4 April**
- `u5`: Aisha Ndiaye (aisha@oyci.org.uk) — staff, hourly, 25 hrs/week
- `u6`: Tom Wallace (tom@oyci.org.uk) — staff, salaried, 35 hrs/week, **inactive**
- `u7`: Tom Ford (tomf@oyci.org.uk) — individual, hourly, 16 hrs/week

**All passwords:** `abc123` (plaintext mock)

**Events (6 total):**
- **e1**: Summer Holiday Programme (8–16 years, 3 staff req'd, 24 max)
  - 2 instances: i1a (Apr 2), i1b (Apr 3)
- **e2**: Weekly Youth Drop-In (11–18 years, recurrence: weekly, 30 max)
  - 2 instances: i2a (completed past), i2b (today, scheduled)
- **e3**: Leadership Workshop (14–18 years, 2 staff, 15 max)
  - 1 instance: i3a (Apr 7, no staff assigned yet)
- **e4**: Countryside Day Trip (10–16 years, 4 staff, 20 max)
  - 1 instance: i4a (Apr 14)
- **e5**: Staff Planning Meeting (internal, recurrence: monthly)
  - 2 instances: i5a (completed past), i5b (Apr 16)
- **e6**: Morning Arts & Crafts (8–14 years, 2 staff, 12 max)
  - 6 instances spread across multiple dates

**Availability Overrides (2 total):**
- u4: Apr 1 — unavailable (personal leave)
- u3: Apr 2 — partial availability (from 12:00 only)

---

### 7. **routes/auth.js** — Authentication

#### Endpoint: `POST /api/auth/login`
**Request Body:**
```json
{
  "email": "admin@oyci.org.uk",
  "password": "abc123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "u1",
    "name": "Sarah Mitchell",
    "email": "admin@oyci.org.uk",
    "role": "admin",
    "phone": "07700 900001",
    "availability": "available",
    "isActive": true,
    "joinedDate": "2020-03-15",
    "payType": "salaried",
    "contractedHours": 37,
    "workingDays": ["mon", "tue", "wed", "thu", "fri"]
  }
}
```
**Errors:**
- 400: Missing email/password
- 401: Invalid credentials or inactive account

**JWT Security:**
- **Secret:** `process.env.JWT_SECRET` or default `'oyci-secret-key'`
- **Expiry:** 8 hours
- **Payload:** `{ id, email, role }`
- **No bcrypt hashing:** Credentials stored plaintext (dev environment)

#### Endpoint: `GET /api/auth/me`
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": { ... user object ... }
}
```

**Errors:**
- 401: No token, invalid Bearer format, expired token
- 404: User not found

---

### 8. **routes/users.js** — User Management

#### Endpoint: `GET /api/users`
**Query Parameters:**
- `?role=staff` — filter by role
- `?active=true|false` — filter by isActive status

**Response:** Array of user objects

#### Endpoint: `GET /api/users/:id`
**Response:** Single user object or 404

#### Endpoint: `POST /api/users`
**Required Fields:** `name`, `email`, `role` (returns 400 if missing)

**Request Body:**
```json
{
  "name": "New Staff",
  "email": "new@oyci.org.uk",
  "role": "staff",
  "phone": "07700 900099",
  "availability": "available",
  "availabilityNote": null,
  "isActive": true,
  "joinedDate": "2026-01-15",
  "payType": "hourly",
  "contractedHours": 20,
  "workingDays": ["mon", "tue", "wed", "thu"]
}
```
**Response (201):** Created user object

**Auto-behaviors:**
- Generates `id` as `'u' + Date.now()`
- Sets default password `'abc123'` in credentials table

#### Endpoint: `PUT /api/users/:id`
**Request Body:** Any combination of user fields

**Response:** Updated user object (merge with existing)

#### Endpoint: `PATCH /api/users/:id/toggle-access`
**No body required**

**Response:** User with `isActive` toggled

#### Endpoint: `PATCH /api/users/:id/availability`
**Request Body:**
```json
{
  "status": "unavailable|available|partial",
  "note": "Optional note"
}
```
**Response:** Updated user

---

### 9. **routes/events.js** — Events & Instances

#### Endpoint: `GET /api/events`
**Query Parameters:**
- `?type=programme|activity|workshop|trip|meeting`
- `?published=true|false`

**Response:** Array of full event objects (with instances, staff, attendees)

#### Endpoint: `GET /api/events/:id`
**Response:** Single full event object

#### Endpoint: `POST /api/events`
**Required Fields:** `title`, `type`, `venue` (returns 400 if missing)

**Request Body:**
```json
{
  "title": "New Event",
  "type": "activity",
  "venue": "OYCI Hub",
  "description": "...",
  "requiredStaff": 2,
  "maxAttendees": 20,
  "recurrence": "none|weekly|monthly",
  "ageGroup": "8–16",
  "tags": ["tag1", "tag2"],
  "createdBy": "u1",
  "isPublished": false,
  "instances": [
    {
      "date": "2026-04-10",
      "startTime": "10:00",
      "endTime": "12:00",
      "shiftStartTime": "09:30",
      "shiftEndTime": "12:30",
      "venueOverride": null,
      "maxAttendees": 20,
      "status": "scheduled",
      "staffAssigned": ["u1", "u2"],
      "attendees": [
        { "youngPersonId": "I10001", "name": "Liam Hendry", "present": null }
      ]
    }
  ]
}
```
**Response (201):** Full event with generated instance IDs

**Transaction:** All instances, staff, and attendees inserted atomically

#### Endpoint: `PUT /api/events/:id`
**Request Body:** Any combination of event fields (instances not updated here)

**Response:** Updated event object

#### Endpoint: `PATCH /api/events/:id/publish`
**Response:** Event with `isPublished: true`, `publishedAt: <timestamp>`

#### Endpoint: `PATCH /api/events/:id/unpublish`
**Response:** Event with `isPublished: false`, `publishedAt: null`

---

#### Instance-Level Endpoints:

#### Endpoint: `GET /api/events/instances/:instanceId`
**Response:**
```json
{
  "event": { full event object },
  "instance": {
    "id": "i1a",
    "eventId": "e1",
    "date": "2026-04-02",
    "startTime": "09:00",
    "endTime": "16:00",
    "shiftStartTime": "08:30",
    "shiftEndTime": "16:30",
    "venueOverride": null,
    "maxAttendees": 24,
    "status": "scheduled",
    "staffAssigned": ["u2", "u3"],
    "attendees": [
      { "youngPersonId": "I10001", "name": "Liam Hendry", "present": null }
    ]
  }
}
```

#### Endpoint: `PATCH /api/events/instances/:instanceId/status`
**Request Body:**
```json
{
  "status": "scheduled|completed|cancelled"
}
```
**Response:** Updated instance

#### Endpoint: `POST /api/events/instances/:instanceId/assign-staff`
**Request Body:**
```json
{
  "staffId": "u2"
}
```
**Response (200):** Updated instance OR

**409 Conflict Response:**
```json
{
  "error": "Shift conflict detected.",
  "conflicts": [
    {
      "staffId": "u2",
      "conflictingEventTitle": "Weekly Youth Drop-In",
      "conflictDate": "2026-03-31",
      "conflictTime": "15:00–18:00"
    }
  ]
}
```

**Conflict Detection Logic:**
- Fetches all staff assignments on same date
- Compares `shiftStartTime/endTime` (falls back to `startTime/endTime`)
- Returns error if any overlap detected: `targetStart < otherEnd && targetEnd > otherStart`

#### Endpoint: `DELETE /api/events/instances/:instanceId/assign-staff/:staffId`
**Response:** Updated instance without that staff member

#### Endpoint: `PATCH /api/events/instances/:instanceId/attendance`
**Request Body:**
```json
{
  "attendeeId": "I10001",
  "present": true
}
```
**Response:** Updated instance (with attendance `present: 1 or 0`)

#### Endpoint: `POST /api/events/instances/:instanceId/save-attendance`
**No body required**

**Side Effect:** Sets instance `status: 'completed'`

**Response:** Updated instance

#### Endpoint: `POST /api/events/instances/book`
**Request Body:**
```json
{
  "userId": "I10001",
  "instanceIds": ["i1a", "i1b"],
  "name": "Liam Hendry",
  "email": "optional@email.com",
  "phone": "optional"
}
```
**Response:**
```json
{
  "success": true,
  "booked": ["i1a", "i1b"],
  "message": "Sessions booked successfully."
}
```

**Logic:**
- Adds attendee to each instance_attendees table with `present: null` (pending)
- Skips if already booked (checks with SELECT before INSERT)
- De-duplicates instanceIds
- Transaction wrapper ensures atomicity

---

### 10. **routes/staff.js** — Staff Status & Availability

#### Endpoint: `GET /api/staff/:staffId/status`
**Query Parameters (one required):**
- `?instanceId=i1a` — check availability for specific instance
- `?date=2026-04-02` — check availability for entire day

**Instance-Level Response:**
```json
{
  "status": "free|conflict|unavailable"
}
```

**With Conflicts:**
```json
{
  "status": "conflict",
  "conflicts": [
    {
      "staffId": "u2",
      "staffName": "Jamie Robertson",
      "conflictingEventTitle": "Weekly Youth Drop-In",
      "conflictDate": "2026-03-31",
      "conflictTime": "15:00–18:00"
    }
  ]
}
```

**Day-Level Response:**
```json
{
  "status": "free|conflict",
  "assignedInstances": [
    {
      "id": "i1a",
      "eventId": "e1",
      "date": "2026-04-02",
      "startTime": "09:00",
      "endTime": "16:00",
      ...
    }
  ]
}
```

**Conflict Detection (Instance-level):**
1. Check if staff is active
2. Check availability_overrides for "unavailable" status on that date
3. Check user.availability === 'unavailable'
4. Query all other assigned instances on same date
5. Compare time overlaps: `targetStart < otherEnd && targetEnd > otherStart`

**Conflict Detection (Day-level):**
- Checks all assigned instances pairwise for overlaps
- Returns conflict if any two overlap

#### Endpoint: `GET /api/staff/:staffId/availability-overrides`
**Query Parameters:**
- `?dateFrom=2026-04-01&dateTo=2026-04-30` — filter date range

**Response:** Array of override objects
```json
[
  {
    "staffId": "u4",
    "date": "2026-04-01",
    "status": "unavailable",
    "isFullDay": true,
    "startTime": null,
    "endTime": null,
    "note": "Personal leave"
  }
]
```

---

### 11. **routes/availability.js** — Availability Override Management

#### Endpoint: `GET /api/availability`
**Query Parameters (all optional):**
- `?staffId=u3`
- `?date=2026-04-02`
- `?dateFrom=2026-04-01&dateTo=2026-04-30`

**Response:** Array of override objects

#### Endpoint: `POST /api/availability`
**Required Fields:** `staffId`, `date`, `status` (returns 400 if missing)

**Request Body:**
```json
{
  "staffId": "u3",
  "date": "2026-04-02",
  "status": "unavailable|partial|available",
  "isFullDay": true,
  "startTime": null,
  "endTime": null,
  "note": "Personal reasons"
}
```

**Override Logic:**
- If `isFullDay: true` or no times provided → creates full-day override
  - **Deletes** any existing full-day override for `staffId + date`
- If time-specific → creates time-specific override
  - **Deletes** any existing override with exact matching times

**Response (201):** Created override object

**Insert or Ignore:** Uses DELETE-then-INSERT pattern to handle updates

#### Endpoint: `DELETE /api/availability`
**Request Body:**
```json
{
  "staffId": "u4",
  "date": "2026-04-01"
}
```
**Response:**
```json
{
  "removed": 1
}
```

---

## SECURITY & CONFIGURATION SUMMARY

| Aspect | Details |
|--------|---------|
| **Authentication** | JWT tokens, 8-hour expiry, `process.env.JWT_SECRET` or hardcoded `'oyci-secret-key'` |
| **Password Storage** | **Plaintext** (no bcrypt, dev environment only) |
| **CORS** | Open to all origins (no origin restrictions) |
| **Database** | SQLite3 (`oyci.db`), WAL mode, FK constraints enabled |
| **Transaction Safety** | Used for multi-step inserts (events, seeding, bookings) |
| **Conflict Detection** | Time-based overlap comparison using `startTime < endTime` logic |
| **Environment Variables** | `PORT` (default 3000), `JWT_SECRET` (optional, has fallback) |

---

## Key Architecture Patterns

1. **Nested Data Model:** Events contain instances; instances contain staff assignments and attendees
2. **Soft Updates on Availability:** POST endpoint uses DELETE-then-INSERT to prevent duplicates
3. **Cascading Deletes:** Foreign keys use `ON DELETE CASCADE`
4. **Transaction Wrapping:** Complex operations (event creation, bookings) use `db.transaction()`
5. **Time Conflict Algorithm:** String comparison (`"09:00" < "16:00"`) for shift overlaps
6. **Status Tracking:** Attendees (`present: null|0|1`), instances (`scheduled|completed|cancelled`), staff availability (`available|partial|unavailable`)