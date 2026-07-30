# AIC Lokichoggio Girls – School Management System Audit

**Scope:** Frontend/backend disconnects, orphaned code, gap analysis for a Kenyan public (CBC) Primary/Junior Secondary school.  
**Prepared:** July 2026  

---

## 1. Executive Summary

The application contains a functional core for user management, marks/grades, teacher assignments, report cards (both JSS and CBC), and a basic timetable. However, several frontend screens and dashboard widgets invoke endpoints that either do not exist, are under-implemented, or are never called from the UI at all. The biggest single gap is that the **Class Analysis** feature is only half-integrated: the API (`/api/analytics/class/:className`) is built and returns useful data, but the frontend renders only a simple position/average/improvement table, missing the charts, mean-score aggregates, grade distribution, and subject-comparison visualisations the name implies.

Because AIC Lokichoggio is a **public CBC school**, the gap analysis is deliberately different from a private-fee school. Heavy tuition/invoicing is de-prioritised in favour of capitation-aware, KEMIS-centric needs (UPI tracking, NEMIS/KEMIS export readiness, class-size limits, JSS specialisation, feeding/BOM/PTA funds, and CBC material distribution).

---

## 2. Methodology

- Scanned `backend/server.js` and `backend/routes/*.js` to catalogue all mounted API prefixes and route definitions.
- Scanned `backend/public/js/*.js` and `backend/public/pages/*.html` for all `fetch(...)` and `apiBase` / `window.API_CONFIG` references.
- Read the key analytics stack: `backend/controllers/analyticsController.js`, `backend/routes/analyticsRoutes.js`, `backend/public/pages/teacher.html` (class-analytics panel).
- Cross-referenced frontend call URLs against mounted route prefixes.
- Reviewed model files in `backend/models/` and seed data to determine which entities are persisted but not exposed on the UI.

---

## 3. Frontend vs. Backend Disconnects

### 3.1 Mounted backend routes (from `server.js`)

The API is mounted under the following prefixes.  **Bold prefixes were not found in any frontend `fetch` call** in the public JS/HTML.

| Prefix | Route File | Frontend usage |
|--------|------------|----------------|
| `/api/auth` | `authRoutes.js` | Login/logout calls |
| `/api/announcements` | `announcementRoutes.js` | Likely used; not traced in this scan |
| `/api/profile` | `profileRoutes.js` | **No direct `fetch` found** |
| `/api/resources` | `resourceRoutes.js` | **No direct `fetch` found** |
| `/api/clubs` | `clubs.js` | Used in dashboard |
| `/api/books` | `books.js` | Used in admin/accountant dashboard |
| `/api/events` | `events.js` | **No direct `fetch` found** |
| **`/api/accounts`** | `accounts.js` | **No direct `fetch` found** |
| `/api/stats` | `stats.js` | **No direct `fetch` found** |
| `/api/users` | `userRoutes.js` | Used heavily (students, import, count) |
| `/api/users` | `schoolUserRoutes.js` | Used |
| `/api/contact` | `contact.js` | Contact page |
| `/api/health` | `health.js` | **No direct `fetch` found** |
| `/api/assignments` | `assignmentRoutes.js` | **No direct `fetch` found** |
| `/api/grades` | `gradesRoutes.js` | Used in marks entry |
| `/api/homeworks` | `homeworkRoutes.js` | **No direct `fetch` found** |
| `/api/roles` | `roles.js` | **No direct `fetch` found** |
| `/api/quizzes` | `quizRoutes.js` | **No direct `fetch` found** |
| `/api/classes` | `class.js` | Used (class list, attendance) |
| `/api/marks` | `marksRoutes.js` | Used heavily |
| `/api/analytics` | `analyticsRoutes.js` | Used by Class Analysis panel |
| `/api/reports` | `reportRoutes.js` | Used for report cards |
| `/api/subjects` | `subjectRoutes.js` | Used in teacher dashboard |
| `/api/fees` | `fees.js` | Used in accountant/finance UI |
| `/api/report-cards` | `reportCardRoutes.js` | Used |
| `/api/attendance` | `attendanceRoutes.js` | Used in admin dashboard |
| **`/api/dashboard`** | `dashboardRoutes.js` | **No direct `fetch` found** |
| `/api/students` | `studentRoutes.js` | Used heavily |
| `/api/teachers` | `teacherRoutes.js` | Used |
| `/api/settings` | `settingsRoutes.js` | Used (contact info) |
| `/api/timetable` | `timetableRoutes.js` | Used |
| `/api/library` | `library.js` | Used in dashboard |
| `/api/backups` | `backups.js` | **No direct `fetch` found** |
| `/api/cbc` | `cbcRoutes.js` | Used for CBC reports |

### 3.2 Notable broken / incomplete links

1. **`/api/payments?status=completed` (index.html)**
   - Frontend references `/api/payments` in fee widgets, but there is no `/api/payments` route in `server.js`.
   - Payments are handled as a sub-resource of `/api/fees/:id/payments` only.
   - **Fix:** Add `GET /api/fees/payments` or `GET /api/payments` and update the widget.

2. **`/api/teachers/count` and `/api/students/count` (index.html)**
   - These endpoints are not defined in `teacherRoutes.js` / `studentRoutes.js`.
   - The dashboard widgets call them and then fall back to `Array.isArray(data) ? data.length` because they return `count` on a normal list.
   - **Fix:** Add `GET /api/teachers/count` and `GET /api/students/count` or update the frontend to use the list endpoints and count the array.

3. **`/api/dashboard` routes (`dashboardRoutes.js`)**
   - Mounted in `server.js` but never called by any public page in this scan.
   - **Fix:** Either remove the mount if `dashboardRoutes.js` is dead, or implement a dashboard index page that consumes it.

4. **`/api/users/provision` (index.html)**
   - Referenced in an admin user creation form. The route exists in `userRoutes.js` (`POST /api/users/provision`).
   - Status: **functional, confirm body shape matches UI fields**.

5. **`/api/report-cards/generate` (teacher.js)**
   - Referenced, but the `reportCardRoutes.js` file defines `/api/report-cards/...` with specific paths and `reportsRoutes.js` defines `/api/reports/generate/:studentId/:term/:year`.
   - `teacher.js` uses `/api/report-cards/generate` which is **not a known route**.
   - **Fix:** Consolidate report-card generation routes or change the frontend URL.

6. **`/api/marks/student/:id` vs. `marksRoutes.js` (`/api/marks/student/:studentId`)**
   - Exists. `teacher.js` uses the path correctly.
   - **Status:** OK.

---

## 4. Class Analysis Feature Deep-Audit

### 4.1 What exists

**Backend**
- `backend/controllers/analyticsController.js`
  - `GET /api/analytics/class/:className?term=...&year=...`
  - Returns:
    - `className`, `term`, `year`, `previousTerm`
    - `scale` (`detectGradingScale`)
    - `studentCount`
    - `students` array with `position`, `name`, `average`, `improvement`
    - `subjectSummaries` array with `subject`, `average`, `highest`, `lowest`, `candidateCount`
- `backend/routes/analyticsRoutes.js` only exposes this one class endpoint and a student-trend endpoint.

**Frontend**
- `backend/public/pages/teacher.html` (around the analytics panel) calls:
  ```
  GET /api/analytics/class/{className}?term={term}&year={year}
  ```
- It renders a simple HTML table with four columns:
  - Position
  - Student
  - Average
  - Improvement

### 4.2 What is missing to make it a "Class Analysis" module

1. **Visualisations**
   - Bar / line chart of student averages.
   - Grade distribution (how many As, Bs, Cs, etc.).
   - Subject-wise class average comparison chart.
   - Trend line for the same class across terms.

2. **Aggregated metrics**
   - Class **mean score** and **median score**.
   - Overall class grade distribution as an explicit array.
   - Standard deviation or spread.
   - Top and bottom five learners.

3. **Subject drill-down**
   - For each subject, the controller already has `highest`, `lowest`, average.
   - The UI does not display any of this; only a student table is shown.

4. **Data export**
   - No PDF, Excel, or CSV export for class analytics.

5. **KEMIS/JSS context**
   - JSS (Grade 7-9) classes need the scale (`8-4-4 legacy`, `CBC`, `JSS 8-tier`) clearly shown.
   - Class-size vs. capitation limits not reported.

### 4.3 Required endpoint additions / controller changes

- Extend `getClassAnalytics` to also return:
  - `classMean`
  - `classMedian`
  - `gradeDistribution: { A: 3, B: 5, ... }`
  - `bestSubjects` and `weakestSubjects` sorted lists
  - `topPerformers` and `strugglingStudents` arrays
- Add `GET /api/analytics/class/:className/trends?year=...` for multi-term comparison.
- Add `GET /api/analytics/export/pdf?className=...&term=...` for printable analysis.

### 4.4 Required UI changes

- Replace the bare HTML table with a proper analytics panel:
  - Summary cards (mean, median, pass rate, enrolment).
  - Bar chart for subject averages.
  - Doughnut/pie chart for grade distribution.
  - Data table with sortable columns.
  - "Export PDF/CSV" button.

---

## 5. Orphaned / Unused Backend Code

The following models, routes, and controllers exist but are not clearly called from the public frontend UI:

| Entity | Route / File | Why it appears orphaned |
|--------|--------------|--------------------------|
| `Account` / `Payment` | `backend/routes/accounts.js`, `backend/models/Account.js` if present | No frontend `fetch` to `/api/accounts` found. |
| `Backup` | `backend/routes/backups.js` | No UI for backup/restore observed. |
| `Event` / `Calendar` | `backend/routes/events.js` | No page calls `/api/events`. |
| `Health` / system check | `backend/routes/health.js` | Useful for monitoring but not wired to a UI. |
| `Homework` | `backend/routes/homeworkRoutes.js`, `backend/models/Homework.js` | Homework section exists in UI but this scan did not trace a `fetch` to `/api/homeworks`. (May be a stub or duplicate of assignments.) |
| `Profile` | `backend/routes/profileRoutes.js` | No frontend `fetch` to `/api/profile/me` or `/api/profile`. |
| `Quiz` | `backend/routes/quizRoutes.js` | Only referenced via a sidebar link to `manage-quizzes.html`; calls not traced. |
| `Role` management | `backend/routes/roles.js` | Roles exist in schema but no role-management UI found. |
| `Stats` | `backend/routes/stats.js` | Not called from the dashboard widgets (widgets call `users`, `fees`, `attendance` directly). |
| `Dashboard` API | `backend/routes/dashboardRoutes.js` | Mounted but no frontend consumer. |

**Note:** Some of these may be called from pages not included in this scan (e.g. `admin/teacher-management.html`, `manage-quizzes.html`). The list should be treated as a starting point for a follow-up deletion-or-wiring review.

---

## 6. Missing Standard School Features (Gap Analysis)

### Public-school / CBC-specific context

AIC Lokichoggio Girls is a **public primary with an internal Junior Secondary (JSS) section**, operating under the **CBC curriculum** and government capitation. The system must therefore support:

1. **KEMIS / UPI tracking (mandatory)**
   - Every learner must have a **Unique Personal Identifier (UPI)**.
   - The UPI must be captured at admission, visible on class lists, student profiles, and report cards.
   - A KEMIS/NEMIS export template should be available.
   - **Current state:** `User.js` does not appear to include `upi` or `kemisId`. This is a critical gap for capitation reporting.

2. **Junior Secondary integration within a primary school**
   - JSS (Grade 7-9) learners are typically in separate streams/subjects while sharing the same physical school.
   - Timetable, report cards, and subject lists already partially separate JSS (see `JUNIOR_SECONDARY_SUBJECTS` and `detectGradingScale`).
   - **Gaps:**
     - No clear "JSS stream" flag on `User` or `Class`.
     - No automatic JSS class-teacher / learning-area-teacher tracking.
     - No TSC number / teacher CPD tracking for JSS-qualified teachers.

3. **Attendance**
   - `attendanceRoutes.js` exists and is used by the admin dashboard.
   - **Gaps:**
     - No teacher attendance.
     - No parent SMS / notification on absence.
     - No term/year attendance summary on report cards.

4. **Financial management (public-school scope)**
   - For a public school, the system should not focus on heavy tuition invoicing.
   - **Required finance modules:**
     - **Feeding / lunch programme** tracking: per-class lunch roll, payments/vouchers, supplier records.
     - **BOM / PTA project funds:** collection, budget lines, receipts, ledger.
     - **CBC materials and uniforms:** issue tracking, inventory, balances owed per learner.
     - **Capitation record-keeping** to reconcile government capitation against school expenditure.
   - **Current state:** `Fee` and `fees.js` exist but appear to model generic fee records. There is no feeding, BOM/PTA, or CBC-materials module.

5. **Parent / guardian portal**
   - No dedicated parent portal or SMS gateway for attendance, fee balances, or report-card release.
   - `User` has `parentContact`; not used for notifications.

6. **Academic term/year rollover**
   - No automated promotion workflow (e.g. `Grade 7` -> `Grade 8` at start of year).
   - No archival of previous-year report cards.

7. **Disciplinary / medical records**
   - No `Incident` or `Medical` models.
   - No guidance/counselling log, important for pastoral care (PPI) already referenced in the timetable.

8. **Library / co-curricular / clubs**
   - `library.js` and `clubs.js` exist but are lightly wired.
   - Book borrowing / returning, and club membership tracking need completion.

---

## 7. Action Plan (Prioritised)

### Priority 1 – Fix broken / risky links

1. **Standardise report-card routes**
   - Decide whether generation is `/api/reports/generate/:studentId/:term/:year` or `/api/report-cards/generate`.
   - Update `teacher.js` to match the chosen route.

2. **Add `/count` endpoints**
   - Add `GET /api/students/count` and `GET /api/teachers/count` (or update the dashboard to use list endpoints and count arrays).

3. **Replace `/api/payments` calls**
   - Update the fee widget to call `/api/fees` with a `status=completed` or `paid` filter, or create a dedicated payment summary endpoint.

### Priority 2 – Complete Class Analysis

4. **Extend `getClassAnalytics`**
   - Return `classMean`, `classMedian`, `gradeDistribution`, `bestSubjects`, `weakestSubjects`, `topPerformers`, `strugglingStudents`.

5. **Build the analytics UI**
   - Use Chart.js to render subject-average bar chart, grade-distribution doughnut, and improvement trend line.
   - Add summary cards and export buttons.

6. **Add `/api/analytics/export/pdf`**
   - Allow printable class-analysis reports.

### Priority 3 – Public-school / KEMIS compliance

7. **Add UPI/KEMIS fields**
   - Add `upi` (Unique Personal Identifier) and `kemisId` fields to the `User` (student) model.
   - Surface UPI on class lists, student profile, and report-card header.
   - Validate UPI uniqueness.

8. **Build feeding / BOM / CBC-materials finance module**
   - New routes/models: `LunchRecord`, `BomPtaFund`, `CbcMaterial`, `UniformIssue`.
   - Add accountant UI tabs for each.

9. **Term/year rollover and promotion**
   - Add `POST /api/students/promote` and an admin UI to bulk-promote a class.

### Priority 4 – Polish and clean-up

10. **Delete or wire orphaned routes**
    - For each route in Section 5, either add a UI or remove the mount from `server.js`.

11. **Add teacher attendance and parent SMS**
    - Extend `attendance` module; integrate SMS gateway.

---

## 8. Biggest Findings (Summary)

- **Class Analysis is 50% complete.** The API is solid and the frontend already calls it, but the UI only shows a four-column table. Users expect charts, mean/median, grade distribution, and export.
- **Several dashboard widgets call endpoints that do not exist or are not wired:** `/api/payments`, `/api/teachers/count`, `/api/students/count`, and a mismatched `/api/report-cards/generate`.
- **A significant set of backend modules is mounted but apparently unused:** `accounts`, `backups`, `events`, `health`, `homeworks`, `profile`, `quizzes`, `roles`, `stats`, and the entire `dashboard` route. These should be wired or removed to avoid dead code.
- **Public-school / KEMIS readiness is the largest architectural gap.** There is no `UPI`, no `kemisId`, no feeding/BOM/PTA/CBC-materials finance, no term promotion, and no parent/SMS communication. Adding these is essential for a Kenyan public school MVP.
