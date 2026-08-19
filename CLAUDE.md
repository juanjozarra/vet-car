@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`vet-car` is a vehicle service history platform for mechanics and car owners. Mechanics manage and maintain records of repairs, maintenance, upgrades, and other work performed on a vehicle. Car owners can view that information to keep a detailed history of all work done on their vehicle.

## Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL via Prisma ORM v7 (adapter-based via `@prisma/adapter-pg`)
- **Auth**: NextAuth.js v4 (credentials-based, JWT sessions)
- **Package manager**: pnpm

# Design System
This project uses a design system defined in `DESIGN.md`  

# Language

Two different languages, do not mix them up:

- **Product UI — Spanish (Latin American).** Everything an end user reads: page copy, labels,
  buttons, placeholders, validation and error messages, empty states, email templates,
  enum label maps (`SERVICE_ITEM_TYPE_LABELS`, `WORKSHOP_SPECIALTY_LABELS`, …).
- **Repository artifacts — English.** Everything a developer reads: commit messages,
  branch names, PR titles and descriptions, PR review comments, code identifiers,
  code comments, test names, and Markdown docs (`CLAUDE.md`, `DESIGN.md`, `docs/**`).
  `DESIGN.md` is the one legacy exception — it is written in Spanish; leave it as is.

PR descriptions follow the format used since PR #1 — a `## Summary` section of bullets
explaining what changed and why, then a `## Test plan` section with checked/unchecked
boxes for each verification actually run. See PRs #8 and #10 for the reference shape.

## Branching

`main` holds only the initial commit. **All work lands on `dev`** — branch from it and
target it with PRs. A worktree created with default settings branches from
`origin/main` and will be nearly empty; re-point it at `origin/dev` before starting.

## Running with Docker

`docker compose up -d --build` starts the whole stack in one command: PostgreSQL, a one-shot `migrate` service (`prisma migrate deploy`), and the app on `http://localhost:3000`. All required env vars have local-dev defaults baked into the compose file; override via shell env if needed (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — the latter is a build arg because `NEXT_PUBLIC_*` is inlined at build time). Stop with `docker compose down`.

For local development outside Docker, start only the DB (`docker compose up -d db`) and use `pnpm dev` — the app container also binds port 3000, so don't run both at once.

DB credentials (local only): `postgresql://vetcar:vetcar@localhost:5432/vetcar`

If `prisma` cannot reach the database while `docker ps` shows the container healthy, check the **Ports** column. `5432/tcp` means the port is exposed inside the Docker network but **not published to the host** — only `0.0.0.0:5432->5432/tcp` is reachable from Windows. Docker silently skips the port proxy when something else held the port at container start (a second compose project from a worktree, for instance), and a `restart` does not re-establish it: the container must be recreated with `docker compose up -d --force-recreate db`. Note the project name comes from the directory, so run compose from the repo root or pass `-p vet-car`, otherwise you get a second container on a second volume.

## Commands

```bash
pnpm dev                                       # Start dev server (http://localhost:3000)
pnpm build                                     # Build for production
pnpm lint                                      # Run ESLint
pnpm test                                      # Run the Jest suite (pure logic + API route tests)
npx jest --coverage                            # Same suite, plus coverage/lcov.info (see note below)
npx prisma migrate dev --name <name>           # Create and apply a migration
npx prisma generate                            # Regenerate Prisma client after schema changes
npx prisma studio                              # Open Prisma DB GUI
```

**`pnpm test` does not produce coverage.** The `test` script is a bare `jest` and
`jest.config.js` sets no `collectCoverage`, so `coverage/lcov.info` is only written when
you pass `--coverage` explicitly. Anything that consumes coverage (SonarQube) needs
`npx jest --coverage` first.

## Prisma v7 notes

- `url` is no longer in `prisma/schema.prisma` — it lives in `prisma.config.ts` (`datasource.url`)
- `prisma.config.ts` does `import 'dotenv/config'`, which loads **`.env`** — dotenv's default filename, *not* `.env.local`. Next.js reads both, but the Prisma CLI only sees `.env`, so `DATABASE_URL` must be there or every `prisma` command fails.
- `lib/prisma.ts` uses `PrismaPg` adapter from `@prisma/adapter-pg` for the runtime client
- Git worktrees carry neither `node_modules` nor the gitignored `.env`. In a fresh worktree, run `pnpm install` and copy `.env` before any build, migration, or scan. After switching between branches with different schemas, re-run `npx prisma generate` — a stale client produces type errors that look like real code bugs.
- On Windows, `git worktree remove` on a worktree that has `node_modules` fails with **`Filename too long`** (the 260-character path limit). It still unregisters the worktree, so the branch is freed and `git worktree list` looks correct — only the directory survives. Delete it with PowerShell's long-path form: `Remove-Item -LiteralPath "\\?\<full path>" -Recurse -Force`.

## Project Structure

```
proxy.ts             # Next 16's rename of middleware.ts — exports a named `proxy` function.
                     # Role/workshop routing and the auth redirect. `/invite/**` is public
                     # and must stay ahead of the unauthenticated redirect.
app/
  (auth)/            # Login, register, and role-selection pages (public)
  (dashboard)/       # Protected routes — redirects to /login if unauthenticated
    mechanic/        # Mechanic dashboard (board, vehicles, team, settings)
    owner/           # Owner dashboard (vehicles, schedule, profile)
    workshop/setup/  # First-run workshop setup wizard (mechanic-only)
  api/
    auth/            # NextAuth.js catch-all route + registration
    vehicles/        # Vehicle creation (owner-scoped) + VIN claim of an unowned vehicle
    workorders/      # POST creates a ticket (walk-in or existing vehicle); PATCH [id]
                     # updates status, progressStage, mechanicId, title, description
    appointments/    # Appointment booking + mechanic check-in
    workshop/        # Own workshop config, staff team, staff invites (mechanic-only)
    workshops/       # Public workshop search/detail (owner-facing)
    invites/         # Invite token lookup/accept/decline
    history/         # Vehicle history entries + photo upload (Vercel Blob)
    profile/         # User profile
  invite/[token]/    # Public staff-invite acceptance page (renders its own logged-out branch)
components/
  ui/              # Reusable UI primitives
  shared/          # Shared layout + feature components (nav, header, history timeline, maps, forms)
  workshop/        # Workshop-specific components (setup form)
lib/
  auth.ts               # NextAuth options and configuration
  prisma.ts             # Prisma client singleton
  utils.ts              # Shared utility functions
  geo.ts                # Haversine distance calculation
  historyFilters.ts     # Vehicle history timeline filtering
  motionTokens.ts       # Shared motion tokens: duration, easing, distance, interaction, colors
  useAutocompleteSuggestions.ts  # Google Places autocomplete hook
  availability.ts       # Slot computation (shared by the availability and booking APIs)
                        # + the UTC slot formatters every caller must use — see Conventions
  email.ts              # Resend email sending (workshop staff invites)
  user.ts               # User lookup/role helpers
  vehicleAccess.ts       # Vehicle ownership/access checks
  vehicleHistory.ts      # HistoryEntry aggregation helpers
  vehicleInput.ts        # Vehicle field parsing/validation, shared by both creation routes
  vehicleOptions.ts      # Car makes, model years and plate regions shared by the vehicle forms
  activeRepairs.ts       # Prisma `where` builders for "which work orders still count as open"
  workOrderStatus(Effects).ts  # Work order status labels/stage order and status side effects
  workshopInvite.ts      # Workshop staff invite token logic
  workshopSpecialty.ts   # WorkshopSpecialty enum labels/helpers
  serviceItemType.ts     # ServiceItemType enum labels/helpers
prisma/
  schema.prisma    # Database schema
types/
  index.ts         # NextAuth session/JWT type extensions
```

## Data Model

```
User (role: MECHANIC | OWNER; MECHANICs also have workshopRole: ADMIN | STAFF)
  ├── Workshop (a MECHANIC belongs to one via workshopId; has location, specialties, slot duration)
  │     ├── WorkshopHours (weekly business hours: dayOfWeek, opensMinute, closesMinute)
  │     ├── WorkshopInvite (staff email invites — status: PENDING | ACCEPTED | DECLINED | CANCELLED)
  │     └── specialties: WorkshopSpecialty[]
  └── Vehicle (ownerId is OPTIONAL — a workshop can record a walk-in nobody has registered)
        ├── WorkOrder (created by MECHANIC — status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
        │     └── ServiceItem (type: REPAIR | MAINTENANCE | UPGRADE | OTHER) — see Known gaps
        ├── Appointment (booked by OWNER against a Workshop's available slots — status: SCHEDULED | COMPLETED | CANCELLED)
        └── HistoryEntry (unified vehicle history feed — type mirrors ServiceItemType, source: OWNER | MECHANIC; optionally linked to the originating WorkOrder/Workshop)
```

`Appointment` has a `@@unique([workshopId, scheduledAt])` constraint — the source of truth against double-booking. `lib/availability.ts`'s `getAvailableSlots` computes valid slots from `WorkshopHours` minus existing appointments; both the availability API and the booking API call it so they can never disagree.

**`Vehicle.ownerId` is nullable.** An unowned vehicle is a walk-in the workshop entered; the owner claims it later by VIN (`POST /api/vehicles/claim`). Every owner-scoped query filters on `ownerId`, and SQL `NULL` matches no equality predicate, so unowned vehicles are invisible to owners by construction — keep it that way rather than adding explicit null checks. Note the FK is `ON DELETE SET NULL` (Prisma's default for an optional relation), so deleting a `User` un-owns their vehicles rather than being blocked.

`HistoryEntry` is the merged timeline shown to owners (`lib/vehicleHistory.ts`), distinguished by `source`. Owners write their own entries; completing a `WorkOrder` writes **one** entry with a hardcoded `type: 'OTHER'` and the work order's title (`lib/workOrderStatusEffects.ts`). `ServiceItem`s do **not** flow into it — see Known gaps.

`WorkshopInvite` backs staff onboarding: a workshop `ADMIN` invites a MECHANIC by email (`POST /api/workshop/invites`), the invite is emailed via `lib/email.ts` (Resend), and the recipient accepts/declines at `/invite/[token]`.

## Auth Roles

- **MECHANIC**: creates work orders — either by checking in an appointment (`POST /api/appointments/[id]/check-in`) or directly for a walk-in (`POST /api/workorders`), recording the vehicle on the spot if it is new; updates ticket status, stage and assignee (`PATCH /api/workorders/[id]`); logs vehicle history entries. If workshop `ADMIN`, also configures the workshop's location, specialties, business hours, and appointment slot duration (`PATCH /api/workshop`) and manages staff invites (`POST/GET /api/workshop/invites`, `GET /api/workshop/team`, `DELETE /api/workshop/team/[userId]`)
- **OWNER**: registers their own vehicles (`POST /api/vehicles`) or claims a workshop-entered one by VIN (`POST /api/vehicles/claim`); reads their vehicles, work orders and history timeline; adds manual history entries with optional photos; searches workshops by distance/specialty and books appointments into a workshop's available slots (`GET /api/workshops/search`, `POST /api/appointments`)

## Conventions that have bitten us

Both of these caused real user-visible bugs. Check them before touching the relevant code.

- **Appointment slots are UTC-anchored naive wall-clock times.** `WorkshopHours.opensMinute`/`closesMinute` have no timezone of their own, so `getAvailableSlots` anchors them with `Date.UTC(...)` — stable regardless of where the server runs. **Anything rendering a `scheduledAt` must format in UTC**, using `SLOT_TIME_FORMATTER` / `SLOT_DATE_TIME_FORMATTER` / `SLOT_DAY_FORMATTER` / `SLOT_MONTH_FORMATTER` from `lib/availability.ts`. A formatter without `timeZone: 'UTC'` shows an hour the workshop never opened. Reach for `SLOT_DATE_TIME_FORMATTER` on any surface listing slots across **several days** — a bare time there is ambiguous, which is exactly how the mechanic board shipped showing "09:00" with no way to tell today's turno from next week's.
- **Never construct an API client at module scope.** `lib/email.ts` builds its `Resend` client *inside* `sendWorkshopInviteEmail`, because the constructor throws when `RESEND_API_KEY` is absent and Next evaluates the module while collecting page data — which made `pnpm build` fail outright anywhere the key isn't set at build time. Same reasoning applies to any future SDK client.

## Code Quality — SonarQube

This repo is wired to SonarQube (`sonar-project.properties`, project key `vetcar`). Run a scan as part of finishing any feature or bugfix, before opening a PR:

- Generate coverage first with `npx jest --coverage` (**not** `pnpm test` — see Commands), so `coverage/lcov.info` isn't missing or stale.
- Fix any new Critical/Blocker issues and quality-gate failures before merging.

Practical notes about this setup, learned the hard way:

- **The local server is Community Edition**, which has no branch analysis. Scanning with `sonar.projectKey=vetcar` overwrites the single stored analysis. To check a branch without disturbing it, publish to a throwaway key (`-Dsonar.projectKey=vetcar-<something>`) and delete the project afterwards.
- **`sonar analyze` (the `sonar` CLI) runs a local rule subset, not the server's ruleset**, and cannot publish. A clean local run is weak evidence — it has reported "No issues found" on a file the server flagged Critical. Only a published scan gives a real quality gate.
- **`sonar auth login` is interactive and cannot be run by an agent** (the CLI says so itself). It opens a browser flow, so it will hang and time out in a non-interactive shell. A human must run it in a real terminal.
- To publish without the CLI: `npx --yes sonarqube-scanner -Dsonar.host.url=<url> -Dsonar.token=<token> -Dsonar.projectKey=<key>`. The rest of the config is read from `sonar-project.properties`.

## Known gaps — see `docs/backlog/`

Parts of this schema are modelled, labelled and rendered but have **no writer**;
other behaviour is documented but was never built. **Read
[`docs/backlog/README.md`](docs/backlog/README.md) before assuming any feature works** —
several things that look implemented are not, and the board renders UI for at
least one of them that can never populate.

That folder is the single source of truth for deferred work, and deliberately not
duplicated here so the two can't drift. One file per item, each carrying the
analysis behind it: the evidence already gathered, the options already weighed,
and the decision still outstanding — enough to pick the item up cold without
re-investigating it.

Add an entry there whenever you defer something, and delete it when the work
merges.

## Environment Setup

Copy `.env.example` to **`.env`** and fill in the values. Next.js also reads `.env.local`, but the Prisma CLI only loads `.env` (see Prisma v7 notes), so put at least `DATABASE_URL` there.

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/vetcar"
NEXTAUTH_SECRET=""   # generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""   # optional — enables the real map and Places Autocomplete; degrades gracefully to manual inputs without it
BLOB_READ_WRITE_TOKEN=""   # Vercel Blob (photo attachments on vehicle history entries); provision via the Vercel dashboard/Marketplace
RESEND_API_KEY=""   # Resend (workshop staff invite emails); get an API key at resend.com or provision via Vercel Marketplace
RESEND_FROM_EMAIL="onboarding@resend.dev"   # Resend's shared dev domain only delivers to your own verified Resend account address — use a verified sending domain in production
```
