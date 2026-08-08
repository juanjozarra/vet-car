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

## Running with Docker

`docker compose up -d --build` starts the whole stack in one command: PostgreSQL, a one-shot `migrate` service (`prisma migrate deploy`), and the app on `http://localhost:3000`. All required env vars have local-dev defaults baked into the compose file; override via shell env if needed (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — the latter is a build arg because `NEXT_PUBLIC_*` is inlined at build time). Stop with `docker compose down`.

For local development outside Docker, start only the DB (`docker compose up -d db`) and use `pnpm dev` — the app container also binds port 3000, so don't run both at once.

DB credentials (local only): `postgresql://vetcar:vetcar@localhost:5432/vetcar`

## Commands

```bash
pnpm dev                                       # Start dev server (http://localhost:3000)
pnpm build                                     # Build for production
pnpm lint                                      # Run ESLint
pnpm test                                      # Run the Jest suite (pure logic + API route tests)
npx prisma migrate dev --name <name>           # Create and apply a migration
npx prisma generate                            # Regenerate Prisma client after schema changes
npx prisma studio                              # Open Prisma DB GUI
```

## Prisma v7 notes

- `url` is no longer in `prisma/schema.prisma` — it lives in `prisma.config.ts` (`datasource.url`)
- `prisma.config.ts` loads `.env` via `dotenv/config` so the CLI picks up `DATABASE_URL`
- `lib/prisma.ts` uses `PrismaPg` adapter from `@prisma/adapter-pg` for the runtime client

## Project Structure

```
app/
  (auth)/            # Login, register, and role-selection pages (public)
  (dashboard)/       # Protected routes — redirects to /login if unauthenticated
    mechanic/        # Mechanic dashboard (board, vehicles, team, settings)
    owner/           # Owner dashboard (vehicles, schedule, profile)
    workshop/setup/  # First-run workshop setup wizard (mechanic-only)
  api/
    auth/            # NextAuth.js catch-all route + registration
    vehicles/        # Vehicle CRUD (owner-scoped)
    workorders/      # Work order + service item management
    appointments/    # Appointment booking/cancellation
    workshop/        # Own workshop config, staff team, staff invites (mechanic-only)
    workshops/       # Public workshop search/detail (owner-facing)
    invites/         # Invite token lookup/accept/decline
    history/         # Vehicle history entries + photo upload (Vercel Blob)
    profile/         # User profile
  invite/[token]/    # Public staff-invite acceptance page
components/
  ui/              # Reusable UI primitives
  shared/          # Shared layout + feature components (nav, header, history timeline, maps, forms)
  workshop/        # Workshop-specific components (setup form)
lib/
  auth.ts               # NextAuth options and configuration
  prisma.ts             # Prisma client singleton
  utils.ts              # Shared utility functions
  geo.ts                # Haversine distance calculation
  availability.ts       # Workshop time-slot availability computation (shared by the availability and booking APIs)
  email.ts              # Resend email sending (workshop staff invites)
  user.ts               # User lookup/role helpers
  vehicleAccess.ts       # Vehicle ownership/access checks
  vehicleHistory.ts      # HistoryEntry aggregation helpers
  workOrderStatus(Effects).ts  # Work order status transition rules and side effects
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
  └── Vehicle (owned by OWNER)
        ├── WorkOrder (created by MECHANIC — status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
        │     └── ServiceItem (type: REPAIR | MAINTENANCE | UPGRADE | OTHER)
        ├── Appointment (booked by OWNER against a Workshop's available slots — status: SCHEDULED | COMPLETED | CANCELLED)
        └── HistoryEntry (unified vehicle history feed — type mirrors ServiceItemType, source: OWNER | MECHANIC; optionally linked to the originating WorkOrder/Workshop)
```

`Appointment` has a `@@unique([workshopId, scheduledAt])` constraint — the source of truth against double-booking. `lib/availability.ts`'s `getAvailableSlots` computes valid slots from `WorkshopHours` minus existing appointments; both the availability API and the booking API call it so they can never disagree.

`HistoryEntry` is the merged timeline shown to owners: mechanics' completed `ServiceItem`s and owners' own manual entries both land here (`lib/vehicleHistory.ts`), distinguished by `source`.

`WorkshopInvite` backs staff onboarding: a workshop `ADMIN` invites a MECHANIC by email (`POST /api/workshop/invites`), the invite is emailed via `lib/email.ts` (Resend), and the recipient accepts/declines at `/invite/[token]`.

## Auth Roles

- **MECHANIC**: creates work orders, adds service items; if workshop `ADMIN`, configures the workshop's location, specialties, business hours, and appointment slot duration (`PATCH /api/workshop`) and manages staff invites (`POST/GET /api/workshop/invites`, `GET /api/workshop/team`)
- **OWNER**: registers their own vehicles (`POST /api/vehicles`), reads vehicles, work orders, and service items; adds manual history entries with optional photos; searches workshops by distance/specialty and books appointments into a workshop's available slots (`GET /api/workshops/search`, `POST /api/appointments`)

## Code Quality — SonarQube

This repo is wired to SonarQube (`sonar-project.properties`, project key `vetcar`). Run a scan as part of finishing any feature or bugfix, before opening a PR:

- Use the `sonarqube:sonarqube-reviewer` agent (or the underlying `sonarqube:sonar-analyze` / `sonarqube:sonar-quality-gate` / `sonarqube:sonar-list-issues` skills) against the changed files or the branch diff.
- Fix any new Critical/Blocker issues and quality-gate failures before merging; use `sonarqube:sonar-fix-issue` for issues tied to a specific rule/location.
- `pnpm test` generates `coverage/lcov.info`, which SonarQube reads for coverage — run it before scanning so coverage data isn't stale.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/vetcar"
NEXTAUTH_SECRET=""   # generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""   # optional — enables the real map and Places Autocomplete; degrades gracefully to manual inputs without it
BLOB_READ_WRITE_TOKEN=""   # Vercel Blob (photo attachments on vehicle history entries); provision via the Vercel dashboard/Marketplace
RESEND_API_KEY=""   # Resend (workshop staff invite emails); get an API key at resend.com or provision via Vercel Marketplace
RESEND_FROM_EMAIL="onboarding@resend.dev"   # Resend's shared dev domain only delivers to your own verified Resend account address — use a verified sending domain in production
```
