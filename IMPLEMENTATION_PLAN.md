# Daily Attendance Tracker — Implementation Plan

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS + shadcn/ui
- **Database:** Firebase Firestore (cloud storage, real-time sync)
- **Auth:** Firebase Authentication (Google Sign-In or Email/Password)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Date handling:** date-fns

---

## Project Structure

```
dtr-app/
├── app/
│   ├── layout.tsx               ← Root layout (fonts, global providers)
│   ├── page.tsx                 ← Dashboard / Overview
│   ├── log/
│   │   └── page.tsx             ← Attendance Log
│   ├── reports/
│   │   └── page.tsx             ← Reports & Summary
│   ├── settings/
│   │   └── page.tsx             ← Settings
│   ├── onboarding/
│   │   └── page.tsx             ← First-time setup
│   └── login/
│       └── page.tsx             ← Firebase Auth login/register
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx       ← Salary, Days Worked, Absences, OT
│   │   ├── TimeInOutPanel.tsx   ← Check-in / Check-out widget
│   │   ├── AttendanceCalendar.tsx
│   │   └── RecentActivity.tsx
│   ├── log/
│   │   └── AttendanceTable.tsx
│   ├── reports/
│   │   ├── MonthlySummary.tsx
│   │   └── WeeklyBarChart.tsx
│   ├── onboarding/
│   │   └── SetupForm.tsx
│   └── ui/                      ← shadcn/ui components
├── hooks/
│   ├── useAttendance.ts         ← CRUD for attendance records (Firestore)
│   ├── useSettings.ts           ← User config synced to Firestore
│   ├── useAuth.ts               ← Firebase auth state
│   └── useSalary.ts             ← Salary computation logic
├── lib/
│   ├── firebase.ts              ← Firebase app init & config
│   ├── firestore.ts             ← Firestore read/write helpers
│   ├── salary.ts                ← Salary & OT calculation functions
│   ├── attendance.ts            ← Late detection, status helpers
│   └── utils.ts                 ← General utilities
├── types/
│   └── index.ts                 ← TypeScript interfaces
└── public/
    └── icons/
```

---

## Pages & Features

### 1. Login / Register Screen
- Firebase Authentication: Email + Password or Google Sign-In
- Redirects to Onboarding if first time, otherwise to Dashboard
- Protected routes: all pages require login

---

### 2. Onboarding Screen *(first-time only)*
Shown once when no user profile exists in Firestore.

**Fields:**
- Full name
- Work start time (e.g., `08:00 AM`)
- Regular end time (e.g., `05:00 PM`)
- Grace period for late arrival (e.g., 15 minutes)
- Rate type toggle: **Daily Rate** or **Hourly Rate**
- Rate amount + currency symbol (₱, $, etc.)
- OT rate multiplier (e.g., 1.25x)
- OT threshold: minutes past regular end time (default: 30 min)
- Saved to Firestore under `users/{uid}/settings`

---

### 2. Dashboard *(main page)*

**Top Stats Cards (4 cards):**
| Card | Value |
|------|-------|
| Expected Salary | Total computed earnings this month |
| Days Worked | Count of present days this month |
| Absences | Working days with no record |
| OT Hours | Total overtime this month |

**Time In / Time Out Panel:**
- Shows today's current status: `Not yet checked in` / `Checked in` / `Checked out`
- **Time In:**
  - Auto-fills current time by default
  - Can be manually overridden before submitting
  - Locked once submitted for the day
  - Shows LATE badge if past start time + grace period
- **Time Out:**
  - Captures current time automatically when button is clicked — no manual input
  - Calculates OT if: `time out > regular end time + 30 minutes`
  - Locked once submitted
- Optional notes field (e.g., "WFH", "Half day")

**Attendance Calendar:**
- Monthly calendar with color-coded days:
  - 🟢 Green — Present, On Time
  - 🟡 Yellow — Present, Late
  - 🟠 Orange — Present + Overtime
  - 🔴 Red — Absent (working day, no record)
  - ⚪ Gray — Weekend / Rest Day
- Click a day to open a modal with full details

**Recent Activity Table:**
- Last 7 entries: Date, Time In, Time Out, Status, OT, Daily Earnings

---

### 3. Attendance Log Page
- Full table of all recorded days
- Columns: Date, Day, Time In, Time Out, Hours Worked, Status, OT Hours, Earnings, Notes
- Filter by: month, year, status (On Time / Late / Absent / OT)
- Export to CSV button

---

### 4. Reports Page
- Monthly selector (navigate past months)
- Summary stats: Days Worked, Absences, Late Days, OT Hours, OT Pay, Base Pay, **Total Expected Salary**
- Weekly bar chart: hours worked per day (Recharts)
- Streak counter: consecutive days worked

---

### 6. Settings Page
All changes save immediately to Firestore under `users/{uid}/settings`.

**Personal Info:**
- Full name
- Email (display only, from Firebase Auth)

**Work Schedule:**
- Work start time
- Regular end time
- Grace period for late (minutes)
- Rest days (checkboxes: Mon–Sun)

**Pay Configuration:**
- Toggle: Daily Rate vs Hourly Rate
- Rate amount
- Currency symbol
- OT multiplier (1.25x, 1.5x, 2x, or custom input)
- OT threshold in minutes

**App Preferences:**
- Dark mode toggle
- Mark specific dates as Holidays

**Data Management:**
- Export all records to CSV
- Export all data as JSON backup
- Reset / Clear all attendance data (with confirmation dialog)
- Sign out button

---

## Firebase & Data Schema

### Firestore Collections

```
Firestore
└── users/
    └── {uid}/
        ├── settings              ← document
        └── records/
            └── {date}/           ← document per day (e.g., "2026-05-09")
```

### `users/{uid}/settings` document
```json
{
  "name": "Juan dela Cruz",
  "startTime": "08:00",
  "endTime": "17:00",
  "gracePeriodMinutes": 15,
  "rateType": "daily",
  "rateAmount": 800,
  "currency": "₱",
  "otMultiplier": 1.25,
  "otThresholdMinutes": 30,
  "restDays": [0, 6],
  "holidays": ["2026-11-01", "2026-12-25"],
  "darkMode": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `users/{uid}/records/{date}` document
```json
{
  "id": "2026-05-09",
  "date": "2026-05-09",
  "timeIn": "08:05",
  "timeOut": "18:10",
  "status": "late",
  "isOT": true,
  "otHours": 1.67,
  "hoursWorked": 10.08,
  "dailyEarnings": 950.00,
  "notes": "",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Firebase Setup Requirements
- Create a Firebase project at firebase.google.com
- Enable **Firestore Database**
- Enable **Authentication** (Email/Password + Google)
- Add Firebase config to `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Each user can only read and write their own data.

---

## Salary Computation Logic

```
Regular Hours     = endTime - startTime (in hours)
Hourly Equivalent = Daily Rate ÷ Regular Hours

Late             = timeIn > (startTime + gracePeriodMinutes)
OT Hours         = max(0, timeOut - endTime - otThresholdMinutes) in hours
OT Pay           = OT Hours × Hourly Equivalent × otMultiplier

If Daily Rate:
  Daily Earnings = Daily Rate + OT Pay

If Hourly Rate:
  Regular Pay    = min(hoursWorked, Regular Hours) × Hourly Rate
  OT Pay         = OT Hours × Hourly Rate × otMultiplier
  Daily Earnings = Regular Pay + OT Pay

Monthly Expected Salary = Sum of all Daily Earnings in the month
```

---

## Additional Features
1. **Late badge** — auto-detected and shown on records
2. **Absent auto-detection** — unfilled working days shown as absent on calendar
3. **Streak counter** — consecutive present days
4. **Notes per day** — short optional text (WFH, Half day, etc.)
5. **CSV export** — for cross-checking with employer's records
6. **JSON backup/restore** — export and re-import all data
7. **Dark mode** — full dark theme via Tailwind
8. **Responsive design** — works on mobile (for quick check-in on the go)
9. **Print-friendly monthly summary** — clean printable report

---

## Build Order
1. Project setup (Next.js 14, TailwindCSS, shadcn/ui, all dependencies)
2. Firebase project setup + config + Firestore security rules
3. TypeScript types/interfaces
4. Firebase init (`lib/firebase.ts`, `lib/firestore.ts`)
5. Auth: Login/Register page + `useAuth` hook + protected route wrapper
6. Onboarding screen (first-time profile + settings setup → Firestore)
7. Settings page + `useSettings` hook (full editable profile & pay config)
8. Dashboard layout (Sidebar + TopBar)
9. Time In/Out panel + `useAttendance` hook
10. Stats cards + `useSalary` hook
11. Attendance calendar component
12. Recent activity table
13. Attendance log page (full table + filters + CSV export)
14. Reports page (summary + bar chart)
15. Dark mode + responsive polish
16. JSON backup/restore in Settings
