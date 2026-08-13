# Simple Timetable Planner

A browser-based scheduling tool that auto-generates weekly timetables for classes, staff, and tasks from CSV data. It randomly (or deterministically, via a seed) places every assignment into a 5-day / 30-minute-slot grid while respecting each class's and each person's availability, then lets you review, manually fix up, and export the result.

Built with React (Create React App) and Tailwind CSS, this runs entirely client-side — no backend or database. All scheduling logic executes in the browser, and Firebase Hosting is used only to serve the static build.

## How it works

1. **Load data** — upload five CSVs (or click "Load Sample Data" for a quick demo):
   - `classes.csv` — `id, Name`
   - `person.csv` — `id, Name`
   - `5264-tasks.csv` — `id, Name, Duration` (duration in 30-minute slots)
   - `5624-assignments.csv` — `id, Main, Assist, Task, Class` (who teaches/assists what task for which class)
   - `5264-immutable.csv` — `id, Class, Day, Slot, Duration, Task` (fixed, non-negotiable slots, e.g. pre-scheduled sessions)

   Sample CSVs for all five are in [`data/`](data).

2. **Review assignments** — the assignments grid lets you enable/disable individual assignments before generating a schedule.

3. **Generate a schedule** — the scheduler:
   - Builds an availability tracker per class and per person across 5 days × 20 slots/day.
   - Assigns a random lunch break window per day.
   - Applies immutable (fixed) slots first, then any assignments you've manually locked in place.
   - Shuffles the remaining assignments (seeded or fully random) and sorts them by descending task duration, then places each one in the first day/slot where the class, main person, and assist person are all free.
   - Retries up to a configurable number of times (with different shuffles) until every assignment is placed, or reports what couldn't be scheduled.
   - Optional toggles allow scheduling before 8:30am or after 5:30pm.

4. **Adjust the result** — the timetable viewer supports drag-and-drop rescheduling, locking placements so they survive regeneration, and surfaces any tasks that couldn't be auto-assigned so you can place them manually.

5. **Review workload** — a staff workload table summarizes hours/assignments per person.

6. **Export or save** — export the finished timetables to a styled XLSX workbook, or save/load the full application state (data + generated schedule) as a JSON file to resume later.

## Getting started

```bash
npm install
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm test        # run tests (react-scripts test)
npm run build   # production build to ./build
```

## Project structure

```
src/
  components/     UI: file upload, assignments grid, control panel,
                   timetable viewer/grid, staff workload, unassigned tasks, logs
  hooks/          useCSVData (CSV/state loading), useScheduler (scheduling
                   orchestration + retries), useLogger
  services/
    scheduler.js        Core scheduling algorithm (trackers, lunch breaks,
                         immutable/locked slots, placement, retries)
    assignmentHelper.js Assignment lookup/formatting helpers
  utils/          csvParser, exportUtils (XLSX export), colorUtils,
                   timeUtils, randomUtils (seeded shuffling)
  constants.js    Days, slots-per-day, lunch options, color palette
data/             Sample CSVs (classes, persons, tasks, assignments, immutable slots)
```

## Deployment

The app is deployed as a static site on Firebase Hosting. See [FIREBASE_DEPLOYMENT.md](FIREBASE_DEPLOYMENT.md) for the full setup and deploy walkthrough; in short:

```bash
npm run build
firebase deploy
```
