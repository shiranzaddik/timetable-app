# School Timetable Builder

React + Node.js app that generates a weekly school timetable from a description of teachers, classes, trends, and constraints. Ships with an elementary-school demo and supports manual edits on top of the solver's output.

## Screenshots

![Input editor — teachers, trends, classes](docs/screenshots/01-input.png)

![Generated timetable — by class, with click-to-swap editing](docs/screenshots/02-timetable.png)

![Generated timetable — by teacher](docs/screenshots/03-timetable-by-teacher.png)

## Features

- **Data model**
  - **Teachers** with subjects, eligible grades (per-subject or per-trend), an optional day off, and arbitrary "can't / prefer-not" time-off windows.
  - **Trends** as first-class entities — a trend is `(grade, optional specialization, subjects[])`. Classes belong to a trend; the trend's subjects are the source of truth.
  - **Classes** with a homeroom (default) teacher, a minimum school-day window (e.g. 08:00–13:00), and a trend pointer.
  - **Global config**: weekdays, start hour, max end hour, and optional **per-day end-hour overrides** so each weekday can finish at a different time.
- **Solver** (backtracking with greedy fallback)
  - Two-pass strategy: first tries every class day starting at slot 0; falls back to best-effort if no all-morning solution exists.
  - Multiple class orderings tried within an 8-second budget.
  - Returns a partial schedule + structured **recommendations** when something doesn't fit (e.g. "class A1 underfilled → edit Trend A or shorten the school day"). Each recommendation includes deep-links to the relevant trend/class/teacher.
  - Auto-assigns a homeroom teacher to classes that don't specify one.
- **UI**
  - Editor for teachers, trends, and classes with live save (when authenticated).
  - **Teacher search + sort** by name / subject / grade. Sort modes group teachers under each subject or grade they teach.
  - **Per-day school-day** editor — set a different max end hour per weekday.
  - Generated timetable in two views (by class / by teacher).
  - **Click-to-swap manual editing** in the by-class view, with automatic conflict detection (red outline + "Conflict" badge when a teacher/room ends up double-booked).
  - **Print / PDF** button — uses a media-print stylesheet so only the timetable hits the page.
  - English + Hebrew (RTL) UI, switchable at runtime.
- **Auth & persistence** (optional, off-by-default)
  - Google OAuth sign-in. When enabled, each user's school config auto-saves to Postgres.
  - Without `GOOGLE_*` and `DATABASE_URL` env vars set, the server runs auth-off / db-off and serves the demo.

## Project layout

```
timetable-app/
├── server/                  Express API + solver (TypeScript, tsx watch)
│   ├── index.ts             HTTP entrypoint, routes, static client serving
│   ├── auth.ts              Google OAuth verification + cookie sessions
│   ├── db.ts                Postgres connection + school config persistence
│   ├── solver.ts            The constraint-satisfaction solver
│   ├── demoData.ts          The elementary-school demo (8 classes, 6 trends, 17 teachers)
│   ├── types.ts             Shared domain types
│   └── test-solver.ts       Standalone smoke test that prints the generated grid
├── client/                  React + Vite UI
│   └── src/
│       ├── main.tsx         React mount
│       ├── App.tsx          Top-level state, auth gating, sections wiring
│       ├── types.ts         Mirrors server/types.ts (kept in sync by hand)
│       ├── i18n.tsx         String dictionary (en/he) + RTL handling
│       ├── index.css        All styles, including the @media print stylesheet
│       └── components/
│           ├── InputView.tsx       Teachers / Trends / Classes editor
│           ├── TeacherForm.tsx     Add/edit teacher (subjects, trends, time-off rows)
│           ├── ClassForm.tsx       Add/edit class (trend dropdown, school-day input)
│           ├── GradeForm.tsx       Edit a trend's subjects + weekly hours
│           ├── TimetableView.tsx   Generated grid + click-to-swap editing
│           ├── RoomForm.tsx        (unused in UI; kept for legacy data)
│           ├── LanguageSwitcher.tsx  English / Hebrew pill
│           └── Login.tsx           Google sign-in screen
├── docs/screenshots/        README images
├── scripts/take-screenshots.mjs    Playwright script to refresh the screenshots
└── package.json             Root scripts (install:all, dev, build, start)
```

## Code-level guide

### Solver (`server/solver.ts`)

The solver is a single ~970-line file with a backtracking search at its core.

1. **Block building** (`buildBlocks`): each class's `subjects[]` is expanded into atomic `Block`s. Most subjects use 2-hour blocks (so a 5h subject becomes `[2, 2, 1]`); Sport and Music use 1-hour blocks. Each block records whether it's mandatory and what (if any) special room it requires.
2. **Per-class slot range** (`classSlotRange`): for each class, computes the range of allowed slots per day — `slotsByDay[d] = min(classMaxFromEndHour, globalEndHourByDay[d] - startHour)`. This is what enforces the **per-day school-day cap**.
3. **State** (`SolveState`): bitmaps for teacher / class / room busy status, per-day hours-left quotas, per-class first/last used slot (for the contiguous-day constraint), and the slot-range data above.
4. **Search** (`search`): standard backtracking. At each step it picks the next ordered block, iterates eligible (day, slot, teacher) candidates filtered by `canPlace`, places it (`commit`), recurses, undoes on failure (`uncommit`).
5. **Greedy fallback**: if the backtracking exhausts without success, blocks are placed greedily; anything that couldn't be placed becomes a `droppedBlock` and triggers a `mandatoryOverflow` recommendation that names the busiest teacher.
6. **Public entry** (`solve`): tries `classOrderingsToTry` permutations, first in **morning-start required** mode (60% of budget), then **best-effort** mode. Returns the highest-scoring result it found.
7. **Enrichment**: after a success, computes `unusedTeachers`, probes `findDayOffSuggestions` (mini-runs that move a teacher's day off to see if it lets more blocks fit), and packages all of this into `SolveResult`.

### Types (`server/types.ts` / `client/src/types.ts`)

Two parallel files; the client mirrors the server so JSON crosses the wire cleanly. The interesting shapes:

- `Config` — `days[]`, `startHour`, `endHour` (global max), `endHourByDay?` (per-day overrides), `slotLabels[]`.
- `Teacher` — `subjects[]`, `grades[]` (fallback), `gradesPerSubject?`, `trendsPerSubject?` (per-subject trend restrictions), `unavailable[]` (typed "can't" / "prefer-not" windows), `canBeDefault?`.
- `SchoolClass` — `grade`, `section`, `trendName?`, per-class `startHour?`/`endHour?` (the class minimum), `defaultTeacherId`, `defaultRoomId`, `subjects[]` (kept in sync with the trend's subjects).
- `Trend` — `{ grade, trendName?, subjects[] }`. Stored on `SchoolInput.trends` so a trend survives even when no class is currently assigned to it.
- `ScheduleRecommendation` — discriminated union: `classDayUnderfilled` (per-class hours hint with `trendKey`, `classId`, etc.) and `mandatoryOverflow` (generic guidance with `busiestTeacherId` so the UI can deep-link).
- `SolveResult` — `success`, `timetables.byClass` / `.byTeacher` (both populated), `droppedBlocks?`, `unusedTeachers?`, `dayOffSuggestions?`, `assignedHomerooms?`, `recommendations?`.

### Server entrypoint (`server/index.ts`)

- `GET /api/auth/me` — auth status + current user.
- `POST /api/auth/google` — verifies the Google id token and sets a signed session cookie.
- `POST /api/auth/logout` — clears the cookie.
- `GET /api/school` / `PUT /api/school` / `DELETE /api/school` — per-user persisted school config (Postgres, when configured).
- `GET /api/demo` — returns `demoInput`.
- `POST /api/solve` — runs `solve(input)` and returns `SolveResult` + `elapsedMs`. The body can be empty to run the demo.

In production the server also serves the built React bundle from `client/dist/`.

### Client (`client/src/`)

- **`App.tsx`** owns the top-level `input: SchoolInput` and `result: SolveResult` state. Handles the auth-check flow, debounced auto-save (1s after the last edit), the demo / clear / sign-out toolbar, the **Recommendations** card list, and the print / generated-timetable section. The `jumpToCard` helper drives recommendation deep-links — it scrolls a matching `id="trend-A"` / `id="class-A1"` / `id="teacher-t-cohen"` into view, flashes the card, and synthesizes a click on its `.edit-trigger` ✎ button.
- **`InputView.tsx`** renders the **Teachers**, **Trends**, and **Classes** sections. Teachers section has a search input + sort dropdown that work together (filter first, then sort/group). Trends are derived from `input.trends` (with a fallback that recovers them from classes for legacy data). Editing a trend's subjects mirrors the change down to every class in that trend.
- **`TimetableView.tsx`** renders the generated grid. In by-class mode every cell is clickable: the first click marks a "pending" cell, the second swaps. After the swap the `byTeacher` grid is rebuilt from `byClass`, then `computeConflicts` flags any (teacher, day, slot) or (room, day, slot) that's now used by more than one class. Conflicting cells get a red outline + "Conflict" badge but are still rendered — manual edits aren't blocked.
- **`i18n.tsx`** is a tiny React context with `t(key, vars)`, `tDay`, `tSubject`, and `tClassName`. Switching language flips `document.documentElement.dir` for RTL Hebrew.

### Demo data (`server/demoData.ts`)

An elementary school: 4 grades (1st–4th), 17 teachers, 6 trends, 8 classes. The demo intentionally has:
- A non-uniform week — Sunday 8–15, Monday 8–14, Tuesday 8–16, Wednesday 8–15, Thursday 8–13.
- Different subject loads per grade (25h for 1st grade, up to 33h for the 4th-grade "music" trend), so different classes end at different hours.
- Two specialty trends — Grade C science (extra science) and Grade D music (extra music).

It solves cleanly with no dropped blocks and no recommendations, so the demo is always a "happy path" the user can mutate.

## Run it locally

```bash
cd timetable-app
npm run install:all
npm run dev
```

Then open http://localhost:5173 and click **Generate Timetable**.

Ports:
- Client (Vite): **5173**
- Server (Express): **4000**

Auth and persistence stay off unless you set:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SESSION_SECRET` on the server.
- `VITE_GOOGLE_CLIENT_ID` on the client.
- `DATABASE_URL` for Postgres.

## Refresh the screenshots

```bash
npm install --no-save playwright
npx playwright install chromium
node scripts/take-screenshots.mjs
```

The script drives a headless Chromium against `http://localhost:5173`, takes the three README screenshots at 1440×1000 @2x, and writes them into `docs/screenshots/`.

## Deploy

See [DEPLOY.md](DEPLOY.md) for one-click deployment to Render. The repo's `build` and `start` scripts are already set up — `build` installs both packages and produces `client/dist/`, `start` boots the server which also serves the static client.

## API quick reference

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/api/auth/me` | — | — | `{ authEnabled, user }` |
| POST | `/api/auth/google` | — | `{ idToken }` | `{ user }` |
| POST | `/api/auth/logout` | — | — | `{ ok: true }` |
| GET | `/api/demo` | ✓ | — | `SchoolInput` |
| GET | `/api/school` | ✓ | — | `{ persisted, config }` |
| PUT | `/api/school` | ✓ | `SchoolInput` | `{ ok: true }` |
| DELETE | `/api/school` | ✓ | — | `{ ok: true }` |
| POST | `/api/solve` | ✓ | `SchoolInput` (optional) | `SolveResult` |
