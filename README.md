# OYCI Management Portal

A unified management platform for **Ochil Youth Community Improvement (OYCI)**, a Scottish youth charity supporting ~500 young people annually. This system replaces fragmented legacy tools (Bookeo, Zoho People, Excel) with an integrated solution for event management, staff scheduling, attendance tracking, and session bookings.

---

## Key Features

- **Event Creation & Scheduling** — Multi-instance events with recurring patterns (daily, weekly, monthly)
- **Staff Allocation** — Drag-and-drop staff assignment with automatic shift conflict detection
- **Attendance Tracking** — Mark young people present/absent per session, lock & complete sessions
- **Leave Management** — Full-day or time-specific unavailability overrides for staff
- **QR Code Bookings** — Generate QR codes linking to session booking pages
- **Role-Based Dashboards** — Tailored views for Admins, Staff, and Young People
- **Dark Mode** — Toggle between light and dark themes
- **Responsive Design** — Mobile-friendly layout with collapsible sidebar

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| State | React Context API |
| Backend | Express.js 4, Node.js |
| Database | SQLite 3 (better-sqlite3, WAL mode) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Key Libs | react-dnd, qrcode.react, date-fns, lucide-react, sonner |

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### 1. Clone the repository

```bash
git clone <repo-url>
cd hackathon
```

### 2. Start the backend API

```bash
cd API/51a7db-tfg_hack_oyci-node-main
npm install
node data/seed.js   # Seed the SQLite database with mock data
npm start           # Starts Express server on http://localhost:3000
```

### 3. Start the frontend

```bash
# From the project root
npm install
npm run dev         # Starts Vite dev server on http://localhost:5173
```

### 4. Open the app

Navigate to `http://localhost:5173` in your browser.

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@oyci.org.uk` | `abc123` |
| Staff | `staff@oyci.org.uk` | `abc123` |
| Staff | `priya@oyci.org.uk` | `abc123` |
| Staff | `callum@oyci.org.uk` | `abc123` |
| Staff | `aisha@oyci.org.uk` | `abc123` |
| Young Person | `tomf@oyci.org.uk` | `abc123` |

---

## Project Structure

```
├── API/51a7db-tfg_hack_oyci-node-main/   # Express backend
│   ├── app.js                            # Server setup, middleware, CORS
│   ├── routes/                           # API route handlers
│   │   ├── auth.js                       # Login & token validation
│   │   ├── users.js                      # User CRUD & access control
│   │   ├── events.js                     # Events, instances, bookings, attendance
│   │   ├── staff.js                      # Staff status & availability checks
│   │   └── availability.js              # Leave/unavailability overrides
│   └── data/
│       ├── db.js                         # SQLite connection & schema init
│       ├── seed.js                       # Database seeder
│       └── mockData.js                   # Sample data for seeding
│
├── src/                                  # React frontend
│   ├── pages/                            # Page-level components
│   ├── components/
│   │   ├── custom/                       # App-specific components
│   │   └── ui/                           # shadcn/ui primitives
│   ├── store/
│   │   ├── apiClient.ts                  # HTTP client with JWT handling
│   │   ├── AppContext.tsx                 # Global state & actions
│   │   └── mockData.ts                   # Frontend mock data
│   ├── types/index.ts                    # TypeScript type definitions
│   └── AppRouter.tsx                     # Route definitions
```

---

## UI Pages

| Page | Route | Role | Description |
|------|-------|------|-------------|
| Login | `/` | Public | Email/password authentication |
| Admin Dashboard | `/dashboard` | Admin | Upcoming events, active staff count, understaffed sessions, today's schedule |
| Staff Dashboard | `/dashboard` | Staff | Assigned sessions, availability status, upcoming & completed events |
| Individual Dashboard | `/dashboard` | Individual | Booked sessions, attendance stats, next session info |
| Staff Management | `/staff` | Admin | Add/edit staff, toggle access, view availability |
| Staff Availability | `/staff-availability` | Admin | Utilisation reports, weekly hours, shift allocation breakdown |
| Staff Allocation | `/staff-allocation` | Admin | Drag-and-drop staff-to-session assignment with conflict indicators |
| Create Event | `/create-event` | Staff/Admin | 4-step wizard: event info → schedule → rules → review |
| Events List | `/events` | All | Browse events, filter by type/status, publish/unpublish, book sessions |
| My Events | `/my-events` | Individual | View personally booked sessions |
| Event Detail | `/event-detail?instanceId=...` | All | Session details, staff list, attendance, QR code, booking |
| Attendance | `/attendance?instanceId=...` | Staff/Admin | Mark attendees present/absent, lock session |
| Event History | `/history` | All | Completed events and sessions |
| Profile | `/profile` | All | Update availability, set leave dates, view attendance stats |

---

## API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email/password → returns JWT token + user object |
| GET | `/auth/me` | Validate token & get current user (requires Bearer token) |

### Users — `/api/users`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users (filters: `?role=staff&active=true`) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |
| PUT | `/users/:id` | Update user details |
| PATCH | `/users/:id/toggle-access` | Toggle user active status |
| PATCH | `/users/:id/availability` | Update availability status & note |

### Events — `/api/events`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | List events (filters: `?type=workshop&published=true`) |
| GET | `/events/:id` | Get event with all instances |
| POST | `/events` | Create event with instances (transactional) |
| PUT | `/events/:id` | Update event metadata |
| PATCH | `/events/:id/publish` | Publish event (visible to young people) |
| PATCH | `/events/:id/unpublish` | Unpublish event |

### Event Instances — `/api/events/instances`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events/instances/:instanceId` | Get instance + parent event |
| PATCH | `/events/instances/:instanceId/status` | Update status (scheduled/completed/cancelled) |
| POST | `/events/instances/:instanceId/assign-staff` | Assign staff (with conflict detection) |
| DELETE | `/events/instances/:instanceId/assign-staff/:staffId` | Remove staff assignment |
| PATCH | `/events/instances/:instanceId/attendance` | Mark attendee present/absent |
| POST | `/events/instances/:instanceId/save-attendance` | Lock attendance & complete session |
| POST | `/events/instances/book` | Book sessions for a young person |

### Staff — `/api/staff`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff/:staffId/status?instanceId=ID` | Check staff status for instance (free/conflict/unavailable) |
| GET | `/staff/:staffId/status?date=YYYY-MM-DD` | Check daily availability |
| GET | `/staff/:staffId/availability-overrides` | Get leave/overrides for date range |

### Availability — `/api/availability`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/availability` | List overrides (filters: staffId, date, dateFrom, dateTo) |
| POST | `/availability` | Create/update availability override |
| DELETE | `/availability` | Remove override by staffId + date |

---

## API Integration

The frontend communicates with the backend through a centralized API client (`src/store/apiClient.ts`):

- **Base URL**: `/api` — Vite dev server proxies requests to `http://localhost:3000`
- **Authentication**: JWT token stored in `localStorage`, automatically attached as `Authorization: Bearer {token}` on every request
- **Type Safety**: Generic `request<T>()` function provides TypeScript-safe API calls
- **Error Handling**: Automatically parses JSON error bodies and surfaces meaningful messages

### State Management

Global state is managed via React Context (`src/store/AppContext.tsx`), providing:

- **State**: `currentUser`, `users`, `events`, `availabilityOverrides`
- **Actions**: `login()`, `logout()`, `addUser()`, `updateUser()`, `addEvent()`, `publishEvent()`, `assignStaffToInstance()`, `markAttendance()`, etc.
- **Helpers**: `getInstanceById()`, `getEventByInstanceId()`, `getUserById()`, `getStaffStatusForInstance()`
- **Conflict Detection**: `getStaffStatusForInstance(instanceId, staffId)` returns `"free"`, `"conflict"`, or `"unavailable"` by checking shift time overlaps and availability overrides

### Data Flow

1. User logs in → JWT token stored in `localStorage`
2. App initializes → Fetches users, events, and availability overrides from the API
3. Admin creates event → `POST /events` with instances
4. Admin assigns staff → `POST /events/instances/:id/assign-staff` (conflict-checked)
5. Young person books session → `POST /events/instances/book`
6. Staff marks attendance → `PATCH /events/instances/:id/attendance`
7. Staff saves & locks attendance → `POST /events/instances/:id/save-attendance` → instance marked completed

---

## Database

SQLite database located at `API/51a7db-tfg_hack_oyci-node-main/data/oyci.db` with WAL mode enabled.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Staff, admin, and individual profiles (name, email, role, availability, pay info) |
| `credentials` | Login credentials (email + hashed password) |
| `events` | Event templates (title, type, venue, capacity, recurrence, tags) |
| `event_instances` | Scheduled sessions with date, time, shift times, status |
| `instance_staff` | Staff-to-instance assignments (many-to-many) |
| `instance_attendees` | Attendance records (pending/present/absent per session) |
| `availability_overrides` | Staff leave and unavailability entries |

---

## Available Scripts

### Frontend (project root)

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Backend (`API/51a7db-tfg_hack_oyci-node-main/`)

```bash
npm start         # Start Express server (port 3000)
node data/seed.js # Seed database with mock data
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Flow — Admin Panel](userflow/admin-panel-userflow.md) | Detailed user flows for Admin, Staff, and Individual roles |
| [Flow Diagrams](userflow/admin-panel-flow-diagrams.md) | Mermaid diagrams for authentication, staff management, scheduling conflicts, bookings, and navigation |
| [The Challenge](docs/the-challenge.md) | Original hackathon challenge brief |

---

## License

See [LICENSE](LICENSE) for details.

