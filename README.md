# Gains

A gym tracker built around one number: **taps per logged set**.

| Action | Taps |
|---|---|
| Start today's workout | 2 |
| Log a set as prescribed | **1** |
| Log a set you deviated on | 2–3 |
| Rest timer | 0 — starts and clears itself |
| Move to the next exercise | 0 — advances itself |

Everything below follows from that. There is **no text keyboard anywhere during a
workout** — steppers and a custom numeric pad only. The screen is held awake with
the Wake Lock API. The tab bar hides entirely while you are lifting.

## What it does

- **Autofill from last time, set for set.** Your third set prefills from last
  week's third set, not your first — so a descending scheme survives, and a
  straight-set lifter never notices the difference.
- **Progression built into the prefill.** Hit the top of the rep range on every
  set and next session starts 5 lb heavier on upper body, 10 lb on lower. Miss
  the bottom of the range twice running and it backs off 10%. Always a
  suggestion, never enforced.
- **736 exercises with demos**, all offline — start and end frames of each
  movement, cross-faded, plus step-by-step instructions, muscles worked,
  equipment and difficulty.
- **Filter by muscle** by tapping a body map, not picking from a dropdown.
- **Five routine templates** — Push/Pull/Legs, Upper/Lower, Full Body, Arnold —
  usable in one tap, plus a builder for your own with supersets and reordering.
- **Plate math.** Which plates to load per side, and a warning when a weight
  cannot be made from the plates you own.
- **Warmup ramps** generated from your working weight, logged separately so they
  never pollute volume or records.
- **PRs detected at log time** — heaviest, best estimated 1RM, best single set —
  so you find out without going to look.
- **Progress**: strength trends per lift, four-week volume shaded onto a body
  map so undertrained areas surface on their own, body-weight tracking, history.
- **Installable PWA.** Add to Home Screen and it works with no signal.

## Your data

Everything lives on your device in IndexedDB. No account, no server, nothing to
pay for, nothing to break in a basement gym.

That also means **the export in Settings is the only backup that exists.** It is
plain JSON — readable, diffable, and restorable without this app. Take one.

The schema is already shaped for sync (ULID ids, `updatedAt`, tombstones instead
of hard deletes), so adding cloud sync later is additive rather than a migration.

## Running it

```bash
npm install
npm run dev              # http://localhost:5173
npm run dev -- --host    # also reachable from your phone on the same wifi
npm run build            # typecheck + production build
npm test                 # unit tests over the lifting logic
npm run e2e              # drives a real browser at phone size
```

Note that `npm run dev` does not register the service worker, so offline and
Add to Home Screen only work against a real build (`npm run build && npm run
preview`) or the deployed site.

## Getting it on your phone

Pushing to `main` deploys to **https://soniv33.github.io/gains/** via GitHub
Actions. Enable it once, under **Settings → Pages → Source → GitHub Actions**;
after that every push to `main` redeploys. You can also run the workflow by hand
from the Actions tab to deploy a branch before merging.

Then open that URL in Safari on your phone and use **Share → Add to Home
Screen**. It installs as a standalone app: its own icon, no browser chrome, and
it works with no signal.

The site is built for the `/gains/` subpath (`npm run build:pages`). Pages has no
SPA rewrite, so the build also emits a `404.html` copy of the app shell — that is
what makes a hard refresh on a deep link work.

If you ever serve it from a domain root instead, `npm run build` is already
correct; the subpath is opt-in via `BASE_PATH`.

## Exercise data

Exercises, images and instructions come from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense,
public domain), vendored at build time by `scripts/ingest-exercises.ts`:
normalised onto this app's enums, with both demo frames transcoded to WebP under
`public/ex/`.

The output is committed rather than fetched at runtime — an app you open in a
basement gym cannot depend on an API being reachable, on a rate limit, or on a
key. Re-run with `npm run ingest` if the upstream dataset improves.

## Layout

```
src/lib/        pure lifting logic — autofill, progression, plates, warmups, PRs
src/data/       exercise catalogue, muscles, routine templates
src/db/         IndexedDB, ULIDs, export/import
src/store/      one zustand store; the whole dataset is held in memory
src/screens/    Today, Session, Routines, Library, Progress, Settings
src/components/ BodyMap, ExerciseDemo, Stepper, NumberPad, RestTimer, Chart
```

`src/lib` is where a bug would silently corrupt years of training history, so it
is pure, dependency-free, and covered by unit tests.
