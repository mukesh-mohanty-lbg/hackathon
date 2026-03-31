# Admin Panel — Mermaid Flow Diagrams

## 1. High-Level System Flow

```mermaid
flowchart TD
    Login[🔐 Login Page]
    AuthCheck{Check Role}
    AdminDash[📊 Admin Dashboard]
    StaffDash[📊 Staff Dashboard]
    IndivDash[📊 Individual Dashboard]

    Login --> AuthCheck
    AuthCheck -->|Admin| AdminDash
    AuthCheck -->|Staff| StaffDash
    AuthCheck -->|Individual| IndivDash

    subgraph AdminCapabilities [Admin Capabilities]
        direction TB
        SM[👥 Staff Management]
        SA[📅 Staff Availability]
        SEA[🔗 Staff-Event Assignment]
        SSH[📜 Staff Service History]
        AC[🔒 Access Control]
    end

    subgraph SharedCapabilities [Shared Capabilities — Admin & Staff]
        direction TB
        CE[➕ Create / Edit Events]
        MA[📋 Mark Attendance]
        MH[📂 My Event History]
        MP[👤 My Profile]
        AT[🟢 Availability Toggle]
    end

    subgraph IndividualCapabilities [Individual Capabilities]
        direction TB
        BE[🔍 Browse Published Events]
        BS[🎟️ Book Sessions]
        ME[📂 My Booked Events]
        AH[📊 Attendance History]
        IP[👤 My Profile]
    end

    AdminDash --> AdminCapabilities
    AdminDash --> SharedCapabilities
    StaffDash --> SharedCapabilities
    IndivDash --> IndividualCapabilities

    style AdminCapabilities fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style SharedCapabilities fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    style IndividualCapabilities fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style Login fill:#f3f4f6,stroke:#6b7280,stroke-width:2px
```

---

## 2. Authentication & Routing Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> LoginPage[Login Page]
    LoginPage --> EnterCreds[Enter Email & Password]
    EnterCreds --> Validate{Valid Credentials?}
    Validate -->|No| ShowError[Show Error Message]
    ShowError --> EnterCreds
    Validate -->|Yes| FetchRole[Fetch User Role]
    FetchRole --> RoleCheck{Role?}
    RoleCheck -->|Admin| AdminRedirect[Redirect to /admin]
    RoleCheck -->|Staff| StaffRedirect[Redirect to /admin — Scoped View]
    RoleCheck -->|Individual| IndivRedirect[Redirect to /dashboard — Bookings View]
    AdminRedirect --> AdminDash[Admin Dashboard — Full Access]
    StaffRedirect --> StaffDash[Staff Dashboard — Own Events Only]
    IndivRedirect --> IndivDash[Individual Dashboard — Own Bookings Only]
```

---

## 3. Admin — Staff Management Flow

```mermaid
flowchart TD
    StaffPage[👥 Staff Management Page] --> ViewList[View All Staff]

    ViewList --> Search[Search / Filter by Name, Role, Status]
    ViewList --> AddStaff[➕ Add New Staff]
    ViewList --> SelectStaff[Select Staff Member]

    AddStaff --> FillForm[Fill Form: Name, Email, Phone, Role]
    FillForm --> SubmitNew[Submit]
    SubmitNew --> Created[✅ Staff Created — Toast Shown]

    SelectStaff --> EditStaff[✏️ Edit Staff]
    SelectStaff --> ToggleAccess[🔒 Activate / Deactivate]
    SelectStaff --> ViewHistory[📜 View Service History]

    EditStaff --> ModifyForm[Modify Name, Email, Phone, Role]
    ModifyForm --> SaveEdit[Save Changes]
    SaveEdit --> Updated[✅ Staff Updated]

    ToggleAccess --> ConfirmDialog{Confirm Action?}
    ConfirmDialog -->|Yes| StatusChanged[✅ Status Changed]
    ConfirmDialog -->|No| SelectStaff

    ViewHistory --> HistoryPanel[Show Event History Panel]
    HistoryPanel --> HistoryDetails[Events Assigned, Dates, Hours Logged]
    HistoryDetails --> ExportOption[📤 Export Service History]
```

---

## 4. Admin — Staff Availability Flow

```mermaid
flowchart TD
    AvailPage[📅 Staff Availability Page] --> OverviewView[View All Staff Availability]

    OverviewView --> CalendarView[Calendar / Grid View]
    CalendarView --> ColorCoded[🟢 Available | 🔴 Unavailable | 🟡 Partial]
    OverviewView --> FilterDate[Filter by Date Range]

    OverviewView --> SelectStaffAvail[Select Staff Member]
    SelectStaffAvail --> OverrideAvail[Override Availability for Date]
    OverrideAvail --> SetStatus[Set Status + Optional Note]
    SetStatus --> SaveAvail[Save]
    SaveAvail --> Updated[✅ Availability Updated]
```

---

## 5. Admin — Staff-Event Assignment Flow

```mermaid
flowchart TD
    EventDetail[📅 Event / Instance Detail] --> AssignBtn[Click 'Assign Staff']
    AssignBtn --> AvailableList[Show Available Staff — Filtered by Date & Time]
    AvailableList --> SelectStaff[Select Staff Members]
    SelectStaff --> ConfirmAssign{Confirm Assignment?}
    ConfirmAssign -->|Yes| Assigned[✅ Staff Assigned — Notification Sent]
    ConfirmAssign -->|No| AvailableList

    EventDetail --> ViewAssigned[View Currently Assigned Staff]
    ViewAssigned --> RemoveStaff[Click 'Remove' on Staff]
    RemoveStaff --> ConfirmRemove{Confirm Removal?}
    ConfirmRemove -->|Yes| Removed[✅ Staff Unassigned]
    ConfirmRemove -->|No| ViewAssigned
```

---

## 6. Scheduling Conflict — Overlapping Session Detection

```mermaid
flowchart TD
    AssignAttempt[Admin Attempts to Assign Staff to Session] --> CheckSchedule[System Checks Existing Assignments]
    CheckSchedule --> OverlapCheck{Time Overlap Detected?\nStartA < EndB AND StartB < EndA}

    OverlapCheck -->|No Overlap| ProceedAssign[✅ Proceed with Assignment]
    ProceedAssign --> Confirm[Staff Assigned Successfully]

    OverlapCheck -->|Overlap Found| BlockAssign[❌ Block Assignment]
    BlockAssign --> ShowConflict[⚠️ Show Conflict Warning]
    ShowConflict --> ConflictDetails["Staff [Name] already assigned to\n[Event] from [Start]–[End]"]
    ConflictDetails --> SuggestAlt[System Suggests Other Available Staff]
    SuggestAlt --> AltAvailable{Alternatives Available?}
    AltAvailable -->|Yes| SelectAlt[Admin Selects Alternative Staff]
    SelectAlt --> ProceedAssign
    AltAvailable -->|No| NoStaffWarning[⚠️ No Available Staff for This Slot]

    style BlockAssign fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style ShowConflict fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style ProceedAssign fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style NoStaffWarning fill:#fee2e2,stroke:#ef4444,stroke-width:2px
```

---

## 7. Staff on Leave / Unavailable — Assignment Filter Flow

```mermaid
flowchart TD
    StatusChange[Staff Marked as Unavailable / On Leave] --> SystemActions[System Auto-Actions]

    SystemActions --> HideFromList[🚫 Hide from Assignment List]
    SystemActions --> MarkUnavail[🔴 Mark Unavailable on Availability Page]
    SystemActions --> CheckExisting{Already Assigned to\nUpcoming Sessions?}

    CheckExisting -->|No| Done[✅ No Further Action Needed]
    CheckExisting -->|Yes| AlertAdmin[⚠️ Alert Admin]
    AlertAdmin --> ShowAffected["Show: [Name] unavailable but assigned\nto [N] upcoming sessions"]
    ShowAffected --> PromptReassign[Prompt Admin to Reassign]
    PromptReassign --> ReassignFlow[Admin Reassigns Each Session]
    ReassignFlow --> ShowAvailable[Show Available Staff for Each Slot]
    ShowAvailable --> AssignReplacement[Select & Assign Replacement]
    AssignReplacement --> NotifyNew[📩 Notification Sent to New Staff]

    StatusReturn[Staff Returns to Available] --> Reappear[✅ Reappears in Assignment List]

    style HideFromList fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style AlertAdmin fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style NotifyNew fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style Reappear fill:#d1fae5,stroke:#10b981,stroke-width:2px
```

---

## 8. Last-Minute Staff Absence — Quick Reassignment Flow

```mermaid
flowchart TD
    Absence[🚨 Staff Reports Last-Minute Absence] --> TriggerAlert[System Triggers Urgent Alert]
    TriggerAlert --> DashAlert["⚠️ Dashboard Alert:\n[Name] unavailable — [N] sessions need reassignment"]
    DashAlert --> HighlightSessions[Affected Sessions Highlighted in Events / Attendance]

    HighlightSessions --> ClickAlert[Admin Clicks Alert or Opens Session]
    ClickAlert --> QuickPanel[📋 Quick Reassignment Panel]
    QuickPanel --> AvailableStaff[List Available Staff\n— Filtered by Today + No Time Conflicts]
    AvailableStaff --> OneClickAssign[One-Click 'Assign' Button]
    OneClickAssign --> StaffAvailable{Staff Available?}

    StaffAvailable -->|Yes| InstantAssign[✅ Instant Assignment]
    InstantAssign --> NotifyReplacement[📩 Notification Sent to Replacement]

    StaffAvailable -->|No| FlagUnstaffed[🔴 Flag Session as 'Unstaffed']
    FlagUnstaffed --> PersistWarning[Persistent Warning on Dashboard]

    style Absence fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style DashAlert fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style InstantAssign fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style FlagUnstaffed fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style QuickPanel fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
```

---

## 9. Staff — Event Creation Flow

```mermaid
flowchart TD
    CreateBtn[➕ Click 'Create Event'] --> Step1[Step 1 — Basics]
    Step1 --> |Name, Description, Programme,\n Tags, Age Range, Capacity, Location| Step2[Step 2 — Schedule]
    Step2 --> |Date, Start/End Time,\n Recurrence, Series End Date| Step3[Step 3 — Rules]
    Step3 --> |Booking Required, Drop-in Allowed,\n Open/Close Times| Step4[Step 4 — Review]
    Step4 --> ReviewSummary[Review All Details]
    ReviewSummary --> Submit{Submit?}
    Submit -->|Yes| EventCreated[✅ Event Created — Status: Scheduled]
    EventCreated --> Redirect[Redirect to Events List]
    Submit -->|No| EditSteps[Go Back to Edit Steps]
    EditSteps --> Step1
```

---

## 10. Staff — Attendance Marking Flow

```mermaid
flowchart TD
    AttendPage[📋 Attendance Page] --> SelectInstance[Select Event Instance — Assigned to Me]
    SelectInstance --> LoadBookings[Load Booked Young People]
    LoadBookings --> PersonList[Show List of Attendees]

    PersonList --> MarkPresent[✅ Mark Present]
    PersonList --> MarkAbsent[❌ Mark Absent]

    MarkPresent --> UpdateStats[Update Stats — Present / Absent / Unmarked]
    MarkAbsent --> UpdateStats

    UpdateStats --> SaveAttendance[💾 Save Attendance]
    SaveAttendance --> Confirmed[✅ Attendance Saved]
```

---

## 11. Staff — My Event History Flow

```mermaid
flowchart TD
    HistoryPage[📂 My Event History] --> LoadEvents[Load All Assigned Events]
    LoadEvents --> EventList[Chronological List]
    EventList --> EventEntry[Date | Event Name | Location | Attendance Marked?]

    EventList --> FilterOptions[Filter by Date Range / Event Type]
    FilterOptions --> FilteredList[Filtered Results]

    EventList --> SummaryStats[Summary: Total Events | This Month | This Year]
```

---

## 12. Staff — Availability Toggle Flow

```mermaid
flowchart TD
    Profile[👤 My Profile Page] --> CurrentStatus[View Current Availability — 🟢 Green Default]
    CurrentStatus --> ToggleBtn[Click Availability Toggle]
    ToggleBtn --> SelectStatus{Select Status}
    SelectStatus -->|Available| Green[🟢 Available]
    SelectStatus -->|Unavailable| Red[🔴 Unavailable]
    SelectStatus -->|Partial| Yellow[🟡 Partial]
    Green --> AddNote[Optional: Add Note]
    Red --> AddNote
    Yellow --> AddNote
    AddNote --> Save[💾 Save]
    Save --> Updated[✅ Status Updated — Visible to Admin]
```

---

## 13. Complete Navigation Map

```mermaid
flowchart LR
    subgraph Admin
        AD[Dashboard] --> AE[Events]
        AD --> AS[Staff]
        AD --> AA[Attendance]
        AD --> AP[My Profile]
        AE --> AE1[All Events]
        AE --> AE2[Create Event]
        AS --> AS1[Staff List]
        AS --> AS2[Availability]
        AS --> AS3[Assignments]
    end

    subgraph Staff
        SD[Dashboard] --> SE[Events]
        SD --> SA[Attendance]
        SD --> SP[My Profile]
        SE --> SE1[My Events / History]
        SE --> SE2[Create Event]
    end

    style Admin fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style Staff fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
```

---

## 14. Individual — Browse & Book Sessions Flow

```mermaid
flowchart TD
    EventsPage[🔍 Browse Events Page] --> ViewPublished[View Published Events]
    ViewPublished --> Filter[Filter by Type / Date / Age Group]
    Filter --> SelectEvent[Select Event]
    SelectEvent --> EventDetail[View Event Detail]
    EventDetail --> ViewInstances[See Available Session Instances]
    ViewInstances --> SelectSessions[Select Sessions to Book]
    SelectSessions --> ConfirmBook{Confirm Booking?}
    ConfirmBook -->|Yes| Booked[✅ Booking Confirmed — Toast Shown]
    Booked --> MyEvents[Session Appears in My Events]
    ConfirmBook -->|No| ViewInstances

    EventDetail --> ViewQR[📱 View / Scan QR Code]
    ViewQR --> QRLink[Opens Event Detail Page on Device]

    style Booked fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style EventsPage fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
```

---

## 15. Individual — My Events & Attendance Flow

```mermaid
flowchart TD
    MyEventsPage[📂 My Events Page] --> LoadBookings[Load Booked Sessions]
    LoadBookings --> SplitView{View Type}
    SplitView -->|Upcoming| UpcomingList[Upcoming Sessions List]
    SplitView -->|Past| PastList[Past Sessions List]

    UpcomingList --> SessionCard[Date | Event Name | Time | Venue]
    PastList --> PastCard[Date | Event Name | Attendance Status]

    PastList --> AttendanceStats[📊 Attendance Summary]
    AttendanceStats --> StatsDetail[Total Sessions | Present | Absent | Rate %]

    style MyEventsPage fill:#d1fae5,stroke:#10b981,stroke-width:2px
```

---

## 16. Event Publishing Flow

```mermaid
flowchart TD
    CreateEvent[Staff / Admin Creates Event] --> Draft[Event Created — Status: Unpublished]
    Draft --> AdminReview[Admin Reviews Event]
    AdminReview --> PublishAction{Publish?}
    PublishAction -->|Yes| Published[✅ Event Published]
    PublishAction -->|No| StayDraft[Event Remains Unpublished]

    Published --> VisibleToAll[Event Visible to Young People on /events]
    Published --> BookingOpen[Young People Can Book Sessions]

    StayDraft --> OnlyAdminStaff[Only Visible to Admin & Staff]

    AdminReview --> UnpublishAction[Unpublish Event]
    UnpublishAction --> Hidden[Event Hidden from Young People]

    style Published fill:#d1fae5,stroke:#10b981,stroke-width:2px
    style StayDraft fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style Hidden fill:#fee2e2,stroke:#ef4444,stroke-width:2px
```

---

## 17. QR Code Booking Flow

```mermaid
flowchart TD
    Staff[Staff Displays QR Code at Venue] --> QRCode[📱 QR Code — Links to /event-detail?instanceId=X]
    QRCode --> Scan[Young Person Scans QR Code]
    Scan --> OpenPage[Opens Event Detail Page on Phone]
    OpenPage --> LoggedIn{Already Logged In?}
    LoggedIn -->|Yes| ViewDetail[View Session Details]
    LoggedIn -->|No| LoginFirst[Redirect to Login]
    LoginFirst --> ViewDetail
    ViewDetail --> BookSession[Book Session]
    BookSession --> Confirmed[✅ Booking Confirmed]

    style QRCode fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    style Confirmed fill:#d1fae5,stroke:#10b981,stroke-width:2px
```

---

## 18. Complete Navigation Map (All Roles)

```mermaid
flowchart LR
    subgraph Admin
        AD[Dashboard] --> AE[Events]
        AD --> AS[Staff]
        AD --> AA[Attendance]
        AD --> AP[My Profile]
        AE --> AE1[All Events]
        AE --> AE2[Create Event]
        AS --> AS1[Staff List]
        AS --> AS2[Availability]
        AS --> AS3[Assignments]
    end

    subgraph Staff
        SD[Dashboard] --> SE[Events]
        SD --> SA[Attendance]
        SD --> SP[My Profile]
        SE --> SE1[My Events / History]
        SE --> SE2[Create Event]
    end

    subgraph Individual
        ID[Dashboard] --> IE[Events]
        ID --> IH[Event History]
        ID --> IP[My Profile]
        IE --> IE1[Browse Events]
        IE --> IE2[My Events]
    end

    style Admin fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style Staff fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    style Individual fill:#d1fae5,stroke:#10b981,stroke-width:2px
```
