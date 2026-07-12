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
- **Package manager**: npm

# Design System
This project uses a design system defined in `DESIGN.md`  

# System language
Spanish (Latin American)

## Running with Docker

`docker compose up -d --build` starts the whole stack in one command: PostgreSQL, a one-shot `migrate` service (`prisma migrate deploy`), and the app on `http://localhost:3000`. All required env vars have local-dev defaults baked into the compose file; override via shell env if needed (`NEXTAUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — the latter is a build arg because `NEXT_PUBLIC_*` is inlined at build time). Stop with `docker compose down`.

For local development outside Docker, start only the DB (`docker compose up -d db`) and use `npm run dev` — the app container also binds port 3000, so don't run both at once.

DB credentials (local only): `postgresql://vetcar:vetcar@localhost:5432/vetcar`

## Commands

```bash
npm run dev                                    # Start dev server (http://localhost:3000)
npm run build                                  # Build for production
npm run lint                                   # Run ESLint
npm test                                       # Run the Jest suite (pure logic + API route tests)
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
  (auth)/          # Login and register pages (public)
  (dashboard)/     # Protected routes — redirects to /login if unauthenticated
    mechanic/      # Mechanic dashboard
    owner/         # Owner dashboard
  api/auth/        # NextAuth.js catch-all route
components/
  ui/              # Reusable UI primitives
  shared/          # Shared layout components (nav, header, etc.)
lib/
  auth.ts          # NextAuth options and configuration
  prisma.ts        # Prisma client singleton
  utils.ts         # Shared utility functions
  geo.ts           # Haversine distance calculation
  availability.ts  # Workshop time-slot availability computation (shared by the availability and booking APIs)
prisma/
  schema.prisma    # Database schema
types/
  index.ts         # NextAuth session/JWT type extensions
```

## Data Model

```
User (role: MECHANIC | OWNER)
  ├── Workshop (a MECHANIC belongs to one; has location, specialties, slot duration)
  │     ├── WorkshopHours (weekly business hours: dayOfWeek, opensMinute, closesMinute)
  │     └── specialties: WorkshopSpecialty[]
  └── Vehicle (owned by OWNER)
        ├── WorkOrder (created by MECHANIC — status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
        │     └── ServiceItem (type: REPAIR | MAINTENANCE | UPGRADE | OTHER)
        └── Appointment (booked by OWNER against a Workshop's available slots — status: SCHEDULED | COMPLETED | CANCELLED)
```

`Appointment` has a `@@unique([workshopId, scheduledAt])` constraint — the source of truth against double-booking. `lib/availability.ts`'s `getAvailableSlots` computes valid slots from `WorkshopHours` minus existing appointments; both the availability API and the booking API call it so they can never disagree.

## Auth Roles

- **MECHANIC**: creates work orders, adds service items; configures their workshop's location, specialties, business hours, and appointment slot duration (`PATCH /api/workshop`)
- **OWNER**: registers their own vehicles (`POST /api/vehicles`), reads vehicles, work orders, and service items; searches workshops by distance/specialty and books appointments into a workshop's available slots (`GET /api/workshops/search`, `POST /api/appointments`)

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/vetcar"
NEXTAUTH_SECRET=""   # generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""   # optional — enables the real map and Places Autocomplete; degrades gracefully to manual inputs without it
```
