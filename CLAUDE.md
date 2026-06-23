@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`vet-car` is a vehicle service history platform for mechanics and car owners. Mechanics manage and maintain records of repairs, maintenance, upgrades, and other work performed on a vehicle. Car owners can view that information to keep a detailed history of all work done on their vehicle.

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL via Prisma ORM v7 (adapter-based via `@prisma/adapter-pg`)
- **Auth**: NextAuth.js v4 (credentials-based, JWT sessions)
- **Package manager**: npm

# Design System
This project uses a design system defined in `DESIGN3.md`  

## Local development database

PostgreSQL runs in Docker. Start it with:

```bash
docker compose up -d    # start the DB
docker compose down     # stop the DB
```

Credentials (local only): `postgresql://vetcar:vetcar@localhost:5432/vetcar`

## Commands

```bash
npm run dev                                    # Start dev server (http://localhost:3000)
npm run build                                  # Build for production
npm run lint                                   # Run ESLint
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
prisma/
  schema.prisma    # Database schema
types/
  index.ts         # NextAuth session/JWT type extensions
```

## Data Model

```
User (role: MECHANIC | OWNER)
  └── Vehicle (owned by OWNER)
        └── WorkOrder (created by MECHANIC — status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
              └── ServiceItem (type: REPAIR | MAINTENANCE | UPGRADE | OTHER)
```

## Auth Roles

- **MECHANIC**: creates work orders, adds service items
- **OWNER**: registers their own vehicles (`POST /api/vehicles`), reads vehicles, work orders, and service items

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/vetcar"
NEXTAUTH_SECRET=""   # generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```
