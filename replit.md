# Replit Agent Build Preferences — SW Monthly Golf (mobile PWA)

## Tech & Platform

- Vite + Express + TypeScript (full-stack)
- Tailwind + shadcn/ui (mobile-first)
- Prisma + SQLite (server DB)
- Wouter for client-side routing
- React Query for API state management
- Comprehensive admin CRUD system implemented

## Current Status (January 2025)

- ✅ Database schema and migrations complete
- ✅ Admin dashboard with navigation working
- ✅ Players CRUD system fully functional
- ✅ Courses CRUD system implemented
- ✅ Tournaments management in progress
- ✅ API routes for all entities working
- ✅ Mobile-first responsive design
- 🔄 Groups management pending
- 🔄 PWA features and offline capabilities pending

## Functional Rules (to follow in subsequent tasks)

- Holes: 18 only. Single tee box for all.
- Roster & Courses: manually added; persist for reuse across events.
- Handicap: HI only. CH computed as: round(HI * (Slope/113) + (Rating - Par)), then cap at 18.
- Net allowance: default 100%; adjustable per event.
- Rounding: nearest (0.5 up).
- Games: Gross Total, Net Total (Net = Gross − Playing CH), Gross Skins (lowest UNIQUE gross; NO carry). Show pushes like "Hole 4: push (2 at 3)".
- Ties (Gross/Net): USGA last 9/6/3/1.
- Groups: Manual only with per-group tee times.
- Scoring: Anyone with passcode can score. Organizer may edit any score.
- Offline conflicts: last-write-wins with an admin review override (later).
- Sharing: Public read-only link; show HI/CH publicly.

## Non-Functional & DX

- Tests: Vitest + RTL. Prioritize scoring math, tiebreak, skins, and group/tee-time flows in later steps.
- Implement ONE cohesive feature per request and create EXACTLY ONE checkpoint.
- Keep diffs minimal. No unused deps. Mobile-only layouts.
- Do NOT enable Extended/High-Power/DI unless explicitly asked.

## Deliverable Expectations

- Update README with clear run/test steps.
- Include small seed placeholders to be expanded in later tasks.
