# School Timetable Builder

React + Node.js app that generates a weekly school timetable from a description of teachers, classes, trends, and constraints. Ships with an elementary-school demo and supports manual edits on top of the solver's output.

## Screenshots

![Input editor — teachers, trends, classes](docs/screenshots/01-input.png)

![Generated timetable — by class, with click-to-swap editing](docs/screenshots/02-timetable.png)

![Generated timetable — by teacher](docs/screenshots/03-timetable-by-teacher.png)

## Features

- **Data model**
  - **Teachers** with optional bilingual names (`name` / `nameHe`), subjects, eligible grades (per-subject or per-trend), an optional day off, and arbitrary "can't / prefer-not" time-off windows.
  - **Trends** as first-class entities — a trend is `(grade, optional specialization, subjects[])`. Classes belong to a trend; the trend's subjects are the source of truth. Trends can be added or removed from the UI; deleting a named trend moves its classes to the regular trend of the same grade, and the regular trend itself can't be removed while classes still reference it.
  - **Classes** with a homeroom (default) teacher, a per-class minimum school-day window (e.g. 08:30–13:00 — minute resolution is editable in the form), and a trend pointer.
  - **Rooms** with optional bilingual names (`name` / `nameHe`).
  - **Global config**: weekdays, start hour, max end hour, and optional per-day end-hour overrides so each weekday can finish at a different time.
- **Solver** (backtracking with greedy fallback)
  - Two-pass strategy: first tries every class day starting at slot 0; falls back to best-effort if no all-morning solution exists.
  - Multiple class orderings tried within an 8-second budget.
  - **Seeded randomization** — each Generate click sends a fresh seed, so re-clicking explores a different ordering of class permutations and produces a different valid schedule.
  - **Per-subject block size** — each subject in a trend has a 1h or 2h consecutive-block setting (e.g. math in 2-hour pairs, music in single hours).
  - Returns a partial schedule + structured **recommendations** when something doesn't fit (e.g. "class A1 underfilled → edit Trend A or shorten the school day"). Each recommendation includes deep-links to the relevant trend/class/teacher.
  - Auto-assigns a homeroom teacher to classes that don't specify one.
- **UI**
  - Editor for teachers, trends, and classes with live save (when authenticated).
  - **Teacher search + sort** by name / subject / grade. Sort modes group teachers under each subject or grade they teach. Duplicate teacher names (case-insensitive, across either language) are refused with an inline error.
  - **Homeroom-of picker inside the teacher form** — a single-select dropdown that assigns the teacher to one class and reassigns any previous homeroom of that class on save.
  - Generated timetable in two views (by class / by teacher).
  - **Click-to-swap manual editing** in the by-class view, with automatic conflict detection (red outline + "Conflict" badge when a teacher/room ends up double-booked).
  - **Snapshots + Compare** — save the current schedule as a named snapshot, then open a side-by-side compare view that highlights every cell that differs between two snapshots.
  - **Print** — two buttons in the timetable header: *Print current* (selected class only) and *Print all classes* (one page per class). A media-print stylesheet hides the editor chrome.
  - **Dark mode** by default — slate-900 page on slate-800 cards with pastel subject chips.
  - English + Hebrew (RTL) UI, switchable at runtime. Demo teachers and rooms ship with both an English and a Hebrew display name; grade letters render as א/ב/ג/ד/ה/ו in Hebrew and class IDs follow ("A1" → "א1").
- **Auth & persistence** (optional, off-by-default)
  - Google OAuth sign-in. When enabled, each user's school config auto-saves to Postgres.
  - Per-address allowlist via `ALLOWED_EMAILS`, per-domain allowlist via `ALLOWED_DOMAINS` (e.g. `gmail.com`). Either gate alone admits a user; both empty means anyone with a verified Google account can sign in.
  - Without `GOOGLE_*` and `DATABASE_URL` env vars set, the server runs auth-off / db-off and serves the demo.

## Project layout

```
timetable-app/
├── server/                  Express API + solver (TypeScript, tsx watch)
│   ├── index.ts             HTTP entrypoint, routes, static client serving
│   ├── auth.ts              Google OAuth verification + cookie sessions
│   ├── db.ts                Postgres connection + school config persistence
│   ├── solver.ts            The constraint-satisfaction solver
│   ├── demoData.ts          The elementary-school demo (12 classes, 8 trends, 25 teachers — bilingual)
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

The solver is a single ~1000-line file with a backtracking search at its core.

1. **Block building** (`buildBlocks`): each class's `subjects[]` is expanded into atomic `Block`s using `subject.blockSize ?? legacyDefault` (legacy default = 1h for sport/music, 2h for everything else). A 5h math subject with blockSize 2 becomes `[2, 2, 1]`; with blockSize 1 it becomes `[1, 1, 1, 1, 1]`. Each block records whether it's mandatory and what (if any) special room it requires.
2. **Per-class slot range** (`classSlotRange`): for each class, computes the range of allowed slots per day — `slotsByDay[d] = min(classMaxFromEndHour, globalEndHourByDay[d] - startHour)`. This is what enforces the **per-day school-day cap**.
3. **State** (`SolveState`): bitmaps for teacher / class / room busy status, per-day hours-left quotas, per-class first/last used slot (for the contiguous-day constraint), and the slot-range data above.
4. **Search** (`search`): standard backtracking. At each step it picks the next ordered block, iterates eligible (day, slot, teacher) candidates filtered by `canPlace`, places it (`commit`), recurses, undoes on failure (`uncommit`).
5. **Greedy fallback**: if the backtracking exhausts without success, blocks are placed greedily; anything that couldn't be placed becomes a `droppedBlock` and triggers a `mandatoryOverflow` recommendation that names the busiest teacher.
6. **Public entry** (`solve(input, seed?)`): when a seed is provided, a mulberry32 PRNG drives two randomization points so re-runs produce different schedules — (a) `classOrderingsToTry` prepends a random class permutation and shuffles the rest of the attempt list, and (b) `orderBlocks` adds a tiny random tiebreaker to the inner score so equal-priority blocks resolve in a different order. Without a seed, behavior is fully deterministic. The function tries the orderings first in **morning-start required** mode (60% of budget), then **best-effort** mode, and returns the highest-scoring result.
7. **Enrichment**: after a success, computes `unusedTeachers`, probes `findDayOffSuggestions` (mini-runs that move a teacher's day off to see if it lets more blocks fit), and packages all of this into `SolveResult`.

### Types (`server/types.ts` / `client/src/types.ts`)

Two parallel files; the client mirrors the server so JSON crosses the wire cleanly. The interesting shapes:

- `Config` — `days[]`, `startHour`, `endHour` (global max), `endHourByDay?` (per-day overrides), `slotLabels[]`.
- `Teacher` — `subjects[]`, `grades[]` (fallback), `gradesPerSubject?`, `trendsPerSubject?` (per-subject trend restrictions), `unavailable[]` (typed "can't" / "prefer-not" windows), `canBeDefault?`.
- `SchoolClass` — `grade`, `section`, `trendName?`, per-class `startHour?`/`endHour?` (the class minimum), `defaultTeacherId`, `defaultRoomId`, `subjects[]` (kept in sync with the trend's subjects).
- `ClassSubject` — `subject`, `hoursPerWeek`, `mandatory?`, `blockSize?` (1 or 2 — controls how the solver chunks the weekly hours).
- `Trend` — `{ grade, trendName?, subjects[] }`. Stored on `SchoolInput.trends` so a trend survives even when no class is currently assigned to it.
- `ScheduleRecommendation` — discriminated union: `classDayUnderfilled` (per-class hours hint with `trendKey`, `classId`, etc.) and `mandatoryOverflow` (generic guidance with `busiestTeacherId` so the UI can deep-link).
- `SolveResult` — `success`, `timetables.byClass` / `.byTeacher` (both populated), `droppedBlocks?`, `unusedTeachers?`, `dayOffSuggestions?`, `assignedHomerooms?`, `recommendations?`.

### Server entrypoint (`server/index.ts`)

- `GET /api/auth/me` — auth status + current user.
- `POST /api/auth/google` — verifies the Google id token and sets a signed session cookie.
- `POST /api/auth/logout` — clears the cookie.
- `GET /api/school` / `PUT /api/school` / `DELETE /api/school` — per-user persisted school config (Postgres, when configured).
- `GET /api/demo` — returns `demoInput`.
- `POST /api/solve?seed=N` — runs `solve(input, seed)` and returns `SolveResult` + `elapsedMs`. The body can be empty to run the demo. Without a seed (or `seed=0`) the solver is deterministic; with a positive seed it randomizes class-ordering attempts and block tiebreakers so different seeds produce different valid schedules.

In production the server also serves the built React bundle from `client/dist/`.

### Client (`client/src/`)

- **`App.tsx`** owns the top-level `input: SchoolInput` and `result: SolveResult` state, plus the in-memory `snapshots[]` list and the current `compareIds` selection. Handles the auth-check flow, debounced auto-save (1s after the last edit), the demo / clear / sign-out toolbar, the **Recommendations** card list, the print / save-snapshot / generated-timetable section, the **Snapshots** list, and the side-by-side **Compare** view. The `jumpToCard` helper drives recommendation deep-links — it scrolls a matching `id="trend-A"` / `id="class-A1"` / `id="teacher-t-cohen"` into view, flashes the card, and synthesizes a click on its `.edit-trigger` ✎ button. `printAllClasses()` toggles a `body.print-mode-all` class so the @media print CSS swaps the interactive grid for a hidden one-per-class block with `page-break-after`. `runSolver()` mints a fresh `Math.random()` seed each click and passes it on the `/api/solve?seed=N` URL.
- **`InputView.tsx`** renders the **Teachers**, **Trends**, and **Classes** sections. Teachers section has a search input + sort dropdown that work together (filter first, then sort/group). Trends are derived from `input.trends` (with a fallback that recovers them from classes for legacy data). Editing a trend's subjects mirrors the change down to every class in that trend.
- **`GradeForm.tsx`** edits a single trend's subjects. Each row exposes the subject name (read-only once set), hours/week, **block size** (1h or 2h), and the **mandatory** checkbox. The block-size select falls back to the legacy default for the subject when the value is undefined.
- **`TimetableView.tsx`** renders the generated grid. In by-class mode every cell is clickable: the first click marks a "pending" cell, the second swaps. After the swap the `byTeacher` grid is rebuilt from `byClass`, then `computeConflicts` flags any (teacher, day, slot) or (room, day, slot) that's now used by more than one class. Conflicting cells get a red outline + "Conflict" badge but are still rendered — manual edits aren't blocked. The component also renders a hidden one-per-class block (`.print-all-classes`) that the print stylesheet surfaces when "Print all classes" is used.
- **`i18n.tsx`** is a tiny React context with `t(key, vars)`, `tDay`, `tSubject`, and `tClassName`. Switching language flips `document.documentElement.dir` for RTL Hebrew.

### Demo data (`server/demoData.ts`)

An elementary school: 6 grades (1st–6th — A through F), 25 teachers, 8 trends, 12 classes. The demo intentionally has:
- A non-uniform week — global day 08:00–16:00, per-day overrides: Sunday 15, Monday 14, Tuesday 16, Wednesday 15, Thursday 13.
- Different subject loads per grade (25h for 1st grade, up to 33h for the 6th-grade list), so different classes end at different hours.
- Two specialty trends — Grade C science (extra science) and Grade D music (extra music).
- Days off spread across the week so no single weekday is a teacher shortage. One teacher (Shira Shapiro) uses a *soft* day off ("prefer not") to demonstrate the difference from the hard day-off case.
- Bilingual teacher and room names — `name` carries the English form, `nameHe` the Hebrew (Israeli-style first + last). The client picks the right one based on the UI language at render time.

It solves cleanly with no dropped blocks and no recommendations, so the demo is always a "happy path" the user can mutate. Because each Generate click passes a fresh seed, re-running on the unmodified demo produces a different valid schedule each time — useful for trying out the Save snapshot → Compare flow.

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
| POST | `/api/solve?seed=N` | ✓ | `SchoolInput` (optional) | `SolveResult` — seed is optional; omit for deterministic, pass a positive integer to vary the result |
