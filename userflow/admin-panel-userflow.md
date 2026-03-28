# Admin Panel User Flow — Event Hub Pro

## Roles Overview

| Role | Description |
|------|-------------|
| **Admin** | Full system control — manages staff, assigns staff to events, controls availability, views service history, grants access. Also inherits all Staff capabilities. |
| **Staff** | Frontline operator — creates/schedules events, marks attendance for assigned events, views own event history, manages own availability status. |

---

## 1. Authentication & Access Flow

### 1.1 Login
- Both Admin and Staff log in via `/login`
- After authentication, the system checks the user's role from `StaffMember.role`
- **Admin** → redirected to `/admin` (Admin Dashboard)
- **Staff** → redirected to `/admin` (Staff Dashboard — scoped view)

### 1.2 Access Control
- Admin can grant/revoke staff access (activate/deactivate accounts)
- Admin can assign roles to staff members
- Staff cannot access Admin-only pages (Staff Management, Staff Assignment)

---

## 2. Admin User Flows

### 2.1 Admin Dashboard (`/admin`)

**What Admin sees:**
- Total active staff count
- Today's scheduled sessions with assigned staff
- Sessions needing staff assignment (alert)
- Staff availability overview (who's available today)
- Quick actions: Create Event, Manage Staff, View Attendance

---

### 2.2 Staff Management (`/admin/staff`)

#### 2.2.1 View Staff List
1. Admin navigates to Staff page
2. Sees a list/grid of all staff members
3. Can search/filter by name, role, or status (active/inactive)
4. Each card shows: Name, Role, Email, Phone, Availability Status (green/red/yellow), Active/Inactive badge

#### 2.2.2 Add New Staff
1. Admin clicks "Add Staff" button
2. Fill in form: Name, Email, Phone, Role (admin/staff)
3. Set initial status: Active
4. Submit → staff account created
5. Toast confirmation shown

#### 2.2.3 Edit Staff
1. Admin clicks "Edit" on a staff card
2. Modify: Name, Email, Phone, Role
3. Save changes → toast confirmation

#### 2.2.4 Activate/Deactivate Staff (Access Control)
1. Admin clicks toggle or menu on a staff card
2. Confirm deactivation (dialog)
3. Staff member marked inactive → can no longer log in
4. Can reactivate later

#### 2.2.5 View Staff Service History
1. Admin clicks "View History" on a staff card
2. Opens a panel/page showing:
   - List of all events the staff was assigned to
   - Date, event name, role in event, attendance status
   - Total events served, hours logged
3. Option to export/extract service history

---

### 2.3 Staff Availability (`/admin/staff/availability`)

#### 2.3.1 View Availability Overview
1. Admin sees a dashboard/calendar view of all staff availability
2. Color-coded: Green (available), Red (unavailable), Yellow (partial)
3. Can filter by date range

#### 2.3.2 Update Staff Availability (Admin Override)
1. Admin selects a staff member
2. Can override availability status for specific dates
3. Save → reflected in assignment suggestions

---

### 2.4 Staff-Event Assignment (`/admin/events/:id/assign`)

#### 2.4.1 Assign Staff to Event
1. Admin opens an event or event instance
2. Clicks "Assign Staff"
3. Sees list of available staff (filtered by availability for that date/time)
4. Selects one or more staff members
5. Confirm assignment → staff notified
6. Assigned staff appear on the event detail

#### 2.4.2 Remove Staff from Event
1. Admin opens event with assigned staff
2. Clicks "Remove" next to a staff member
3. Confirm removal → staff unassigned

---

### 2.5 Scheduling Conflict & Absence Handling

#### 2.5.1 Overlapping Session Conflict Detection
> **Example:** Session A: 4:00–5:00, Session B: 4:30–5:30

1. Admin attempts to assign a staff member to an event instance
2. System checks the staff member's existing assignments for the same date
3. If the new session's time window overlaps with any existing assignment:
   - **Assignment is blocked** — system prevents the save
   - **Conflict warning** is displayed: _"Staff member [Name] is already assigned to [Event] from [Start]–[End]. Cannot assign to overlapping session."_
   - System **suggests other available staff** who have no conflicts for that time slot
4. Admin can select an alternative staff member from the suggested list
5. If no available staff exist, system shows a warning: _"No available staff for this time slot"_

**Validation Rules:**
- Two sessions overlap if `StartA < EndB AND StartB < EndA`
- Buffer time (optional): configurable gap between sessions (e.g., 15 min)
- Conflict check runs on both new assignments and bulk assignments

#### 2.5.2 Staff on Leave / Unavailable
1. Staff member sets status to **Unavailable** (or Admin marks them on leave)
2. System automatically:
   - Marks the staff member as **unavailable** for the leave period
   - **Hides them from the assignment list** — they will not appear when Admin clicks "Assign Staff"
   - Shows a visual indicator (🔴 red) on the Staff Availability page
3. If the staff was already assigned to sessions during the leave period:
   - System shows an **alert to Admin**: _"[Name] has been marked unavailable but is assigned to [N] upcoming sessions"_
   - Admin is prompted to **reassign those sessions** to other available staff
4. Staff member reappears in the assignment list once they return to **Available** status

#### 2.5.3 Last-Minute Staff Absence
1. Staff member reports absence (or Admin flags them as absent on the day)
2. System triggers **urgent reassignment flow**:
   - Admin sees a **priority alert** on the Dashboard: _"⚠️ [Name] is unavailable — [N] sessions need reassignment today"_
   - Affected sessions are highlighted in the Attendance / Events view
3. Admin clicks the alert or navigates to the affected session
4. System shows a **quick reassignment panel**:
   - Lists all **currently available staff** (filtered by today's availability and no time conflicts)
   - One-click "Assign" button next to each available staff member
5. Admin selects replacement staff → instant assignment → notification sent to replacement
6. If no staff are available, session is flagged as **"Unstaffed"** with a persistent warning

**Summary of System Behaviours:**

| Scenario | System Action |
|---|---|
| Overlapping session assignment | ❌ Block assignment + show conflict warning + suggest alternatives |
| Staff on leave / unavailable | 🚫 Hide from assignment list + alert if already assigned |
| Last-minute absence | ⚠️ Priority dashboard alert + quick reassignment panel |

---

### 2.6 Event Management (Admin inherits Staff capabilities)
- Admin can do everything Staff can do (see Section 3 below)
- Additionally, Admin can **delete** events and **bulk manage** event instances

---

## 3. Staff User Flows

### 3.1 Staff Dashboard (`/admin`)

**What Staff sees (scoped to self):**
- My upcoming assigned events (today/this week)
- My availability status toggle (Green by default)
- Quick stats: Events this week, Events this month, Total events served
- Quick actions: Create Event, Mark Attendance

---

### 3.2 My Profile & Availability

#### 3.2.1 View Profile
1. Staff sees own profile: Name, Email, Phone, Role, Workday Type
2. Availability status indicator (Green = Available, default)

#### 3.2.2 Toggle Availability
1. Staff clicks availability toggle
2. Select status: Available (Green) / Unavailable (Red) / Partial (Yellow)
3. Optionally add a note (e.g., "Available after 2pm")
4. Save → Admin can see updated availability

---

### 3.3 Event Creation & Scheduling (`/admin/events/create`)

#### 3.3.1 Create New Event
1. Staff clicks "Create Event"
2. **Step 1 — Basics**: Event name, description, programme, tags, age range, capacity, location
3. **Step 2 — Schedule**: Date, start/end time, recurrence (weekly/one-off), series end date
4. **Step 3 — Rules**: Booking required toggle, Drop-in allowed toggle, booking open/close times
5. **Step 4 — Review**: Summary of all details
6. Submit → Event created with status "scheduled"
7. Toast confirmation → redirected to events list

#### 3.3.2 Edit Own Event
1. Staff navigates to Events list
2. Clicks "Edit" on an event they created
3. Modify details → Save
4. Changes reflected immediately

---

### 3.4 Attendance Marking (`/admin/attendance`)

#### 3.4.1 Mark Attendance for Assigned Event
1. Staff navigates to Attendance page
2. Selects an event instance **they are assigned to**
3. Sees list of booked young people
4. For each person: Mark Present (✓) or Absent (✗)
5. Stats update in real-time: Present count, Absent count, Unmarked count
6. Save attendance → persisted

#### 3.4.2 View Attendance History
1. Staff can view past event instances they attended
2. See attendance records for each past session

---

### 3.5 My Event History (`/admin/events/history`)

#### 3.5.1 View Assigned Event History
1. Staff navigates to "My Events" or "Event History" section
2. Sees a chronological list of all events they were assigned to
3. Each entry shows: Date, Event name, Location, Role, Attendance marked (yes/no)
4. Can filter by date range, event type
5. Summary stats: Total events, This month, This year

---

## 4. Page-Level Access Matrix

| Page / Feature | Admin | Staff |
|---|---|---|
| Dashboard (full overview) | ✅ | ❌ (scoped view) |
| Staff Management (CRUD) | ✅ | ❌ |
| Staff Availability (all staff) | ✅ | ❌ |
| Staff-Event Assignment | ✅ | ❌ |
| Staff Service History (any staff) | ✅ | ❌ |
| Staff Access Control (activate/deactivate) | ✅ | ❌ |
| Create/Edit Events | ✅ | ✅ |
| Delete Events | ✅ | ❌ |
| Mark Attendance (assigned events) | ✅ | ✅ |
| My Availability Toggle | ✅ | ✅ |
| My Event History | ✅ | ✅ |
| My Profile | ✅ | ✅ |

---

## 5. Navigation Structure

### Admin Sidebar
```
📊 Dashboard
📅 Events
   ├── All Events
   ├── Create Event
👥 Staff
   ├── Staff List
   ├── Availability
   ├── Assignments
📋 Attendance
👤 My Profile
```

### Staff Sidebar
```
📊 Dashboard (My View)
📅 Events
   ├── My Events / History
   ├── Create Event
📋 Attendance (My Assigned)
👤 My Profile
```
---
