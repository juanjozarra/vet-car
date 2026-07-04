# Workshop Search & Appointment Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative placeholders in the owner's "Agendar" screen with a real Google Maps–backed workshop search (sorted by distance, filterable by specialty) and a real availability-aware appointment booking flow, backed by new Workshop location/specialty/business-hours data that mechanics configure themselves.

**Architecture:** Mechanics gain a small "Configuración del taller" settings page (Places-Autocomplete-powered location picker, specialty checkboxes, weekly business hours, slot duration). Owners' `/owner/schedule` page renders a real `@vis.gl/react-google-maps` map centered on the browser's geolocation, fetches workshops from a new search API that computes Haversine distance and sorts by it, and books appointments through a date/time-slot picker backed by a pure availability-computation function shared between the availability API and the booking API's server-side conflict check. Everything Google-Maps-related degrades gracefully to plain text inputs when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't configured, since no Google Cloud project exists yet.

**Tech Stack:** Next.js 15+ App Router (async `params`), Prisma ORM v7 / PostgreSQL, `@vis.gl/react-google-maps` v1.9 (official Google-maintained React wrapper — replaces the community `@react-google-maps/api` and the now-legacy `google.maps.places.Autocomplete` widget), Google Maps JavaScript API + Places API (New) + Geocoding API (all client-side, one publishable key), Jest (already configured, `testEnvironment: 'node'`), shadcn/ui + Tailwind v4 (existing design system, Midnight Tech).

## Global Constraints

- System language: Spanish (Latin American / Rioplatense voseo — "Configurá", "Ingresá", matching existing copy in `WorkshopSetupForm.tsx`).
- Follow `DESIGN.md` ("Midnight Tech"): dark surfaces, cyan `primary` accents, Jetbrains Mono for headings/labels, 8px spacing rhythm, existing shadcn primitives (`Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `Label`).
- No new npm dependencies except `@vis.gl/react-google-maps` (React ≥19 compatible, confirmed). Everything else (distance math, slot math, date-strip picker, time inputs) is hand-rolled with the stdlib/native `<input type="time">` — no calendar library, no marker-clustering library, no server-side geocoding proxy.
- Google Maps integration must not hard-fail when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset — the user does not have a Google Cloud project yet. Every Maps-dependent UI piece needs a plain-input/plain-list fallback.
- All new Next.js App Router code uses the current async `params`/`searchParams` convention (`{ params }: { params: Promise<{ id: string }> }`), matching this repo's Next 16 install — do not use the pre-15 synchronous-params pattern.
- Business hours/slots are computed in the server's local time zone (no per-workshop time zone support — single-region MVP, documented limitation).
- Pure logic (distance math, slot computation) gets real Jest unit tests, following TDD (red → green). UI wiring and schema changes are verified manually (run the dev server / `npx prisma validate`) since the project has zero component/integration tests today — this plan doesn't invent new test infrastructure for that.

---

## Context: what already exists

- `prisma/schema.prisma` has `Workshop` (name/address/phone/email — **no location, no specialty, no hours**) and `Appointment` (scheduledAt/status/vehicleId/workshopId, **no conflict protection**).
- `app/(dashboard)/owner/schedule/ScheduleView.tsx` already has a `ShopCard`, a `BookingModal`, and a search bar — but the map is fake CSS pins (`MAP_PINS`), the search bar is fully decorative, and the booking modal is a single `datetime-local` input with zero availability awareness. All three are marked with `ponytail:` comments pointing at this exact feature.
- `app/(dashboard)/mechanic/page.tsx` is a bare stub with no nav, no settings — mechanics currently have no way to enter location/specialty/hours data, so this plan adds a minimal settings page (`components/shared/DashboardNav.tsx` already has a `ponytail:` comment anticipating this: "make items a prop then").
- No Google Maps library is installed. No `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists yet.

---

### Task 1: Schema — Workshop location, specialties, business hours, appointment conflict protection

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `WorkshopSpecialty` enum (8 values), `Workshop.latitude/longitude/googlePlaceId/specialties/slotDurationMinutes` fields, `WorkshopHours` model (`id, workshopId, dayOfWeek, opensMinute, closesMinute`), `Appointment` `@@unique([workshopId, scheduledAt])`.

- [ ] **Step 1: Replace `prisma/schema.prisma` with the following complete file**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  OWNER
  MECHANIC
}

enum WorkOrderStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ServiceItemType {
  REPAIR
  MAINTENANCE
  UPGRADE
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

enum WorkshopSpecialty {
  MECANICA_GENERAL
  ELECTRICIDAD_AUTOMOTRIZ
  CHAPA_Y_PINTURA
  NEUMATICOS_Y_LLANTAS
  DIAGNOSTICO_ELECTRONICO
  TRANSMISION
  AIRE_ACONDICIONADO
  OTRO
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  phone         String?
  address       String?
  role          Role      @default(OWNER)
  workshopId    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  workshop   Workshop?   @relation(fields: [workshopId], references: [id])
  accounts   Account[]
  sessions   Session[]
  vehicles   Vehicle[]   @relation("VehicleOwner")
  workOrders WorkOrder[] @relation("MechanicWorkOrders")
}

model Workshop {
  id                  String              @id @default(cuid())
  name                String
  address             String
  phone               String
  email               String
  latitude            Float?
  longitude           Float?
  googlePlaceId       String?             @unique
  specialties         WorkshopSpecialty[] @default([])
  slotDurationMinutes Int                 @default(60)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  mechanics    User[]
  appointments Appointment[]
  hours        WorkshopHours[]
}

model WorkshopHours {
  id           String   @id @default(cuid())
  workshopId   String
  dayOfWeek    Int
  opensMinute  Int
  closesMinute Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  workshop Workshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)

  @@index([workshopId])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Vehicle {
  id         String   @id @default(cuid())
  make       String
  model      String
  year       Int
  vin        String?  @unique
  plate      String?
  nickname   String?
  mileage    Int?
  photoUrl   String?
  plateState String?
  ownerId    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  owner        User          @relation("VehicleOwner", fields: [ownerId], references: [id])
  workOrders   WorkOrder[]
  appointments Appointment[]
}

model WorkOrder {
  id          String          @id @default(cuid())
  title       String
  description String?         @db.Text
  status      WorkOrderStatus @default(PENDING)
  startDate   DateTime?
  endDate     DateTime?
  vehicleId   String
  mechanicId  String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  vehicle      Vehicle       @relation(fields: [vehicleId], references: [id])
  mechanic     User          @relation("MechanicWorkOrders", fields: [mechanicId], references: [id])
  serviceItems ServiceItem[]
}

model ServiceItem {
  id          String          @id @default(cuid())
  type        ServiceItemType
  description String          @db.Text
  laborHours  Float?
  partsCost   Float?
  notes       String?         @db.Text
  workOrderId String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
}

model Appointment {
  id          String            @id @default(cuid())
  title       String
  scheduledAt DateTime
  notes       String?           @db.Text
  status      AppointmentStatus @default(SCHEDULED)
  vehicleId   String
  workshopId  String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  vehicle  Vehicle   @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  workshop Workshop? @relation(fields: [workshopId], references: [id])

  @@unique([workshopId, scheduledAt])
}
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name workshop_location_specialty_hours`
Expected: `Your database is now in sync with your schema.` and a new folder under `prisma/migrations/`.

- [ ] **Step 3: Regenerate the Prisma Client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` with no errors. `WorkshopSpecialty` and `WorkshopHours` are now importable from `@prisma/client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add workshop location, specialties, and business hours schema"
```

---

### Task 2: `lib/geo.ts` — Haversine distance (TDD)

**Files:**
- Create: `lib/geo.ts`
- Test: `lib/geo.test.ts`

**Interfaces:**
- Produces: `LatLng { lat: number; lng: number }`, `haversineDistanceKm(a: LatLng, b: LatLng): number`

- [ ] **Step 1: Write the failing test — create `lib/geo.test.ts`**

```ts
import { haversineDistanceKm } from './geo'

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm({ lat: -34.6037, lng: -58.3816 }, { lat: -34.6037, lng: -58.3816 })).toBe(0)
  })

  it('matches the known great-circle distance between Buenos Aires and Córdoba', () => {
    const buenosAires = { lat: -34.6037, lng: -58.3816 }
    const cordoba = { lat: -31.4201, lng: -64.1888 }
    const distance = haversineDistanceKm(buenosAires, cordoba)
    expect(distance).toBeGreaterThan(600)
    expect(distance).toBeLessThan(700)
  })

  it('is symmetric', () => {
    const a = { lat: 10, lng: 10 }
    const b = { lat: 20, lng: -5 }
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest lib/geo.test.ts`
Expected: FAIL — `Cannot find module './geo'`

- [ ] **Step 3: Create `lib/geo.ts`**

```ts
export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest lib/geo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/geo.ts lib/geo.test.ts
git commit -m "feat: add haversine distance calculation"
```

---

### Task 3: `lib/availability.ts` — Slot computation (TDD)

**Files:**
- Create: `lib/availability.ts`
- Test: `lib/availability.test.ts`

**Interfaces:**
- Consumes: nothing (pure function)
- Produces: `WorkshopHoursWindow { dayOfWeek: number; opensMinute: number; closesMinute: number }`, `GetAvailableSlotsParams { hours: WorkshopHoursWindow[]; slotDurationMinutes: number; bookedTimes: Date[]; now: Date; daysAhead?: number; minLeadMinutes?: number }`, `getAvailableSlots(params: GetAvailableSlotsParams): Date[]`

- [ ] **Step 1: Write the failing tests — create `lib/availability.test.ts`**

```ts
import { getAvailableSlots } from './availability'

describe('getAvailableSlots', () => {
  // 2024-01-01 is a Monday (dayOfWeek = 1), used as a fixed, deterministic reference point.
  const monday = new Date(2024, 0, 1, 8, 0)

  it('returns no slots for a day with no configured hours', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 2, opensMinute: 540, closesMinute: 780 }], // Tuesday only
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 1,
    })
    expect(slots).toEqual([])
  })

  it('generates one slot per hour within the configured window', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }], // Monday 9:00-13:00
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots.map(s => s.getHours())).toEqual([9, 10, 11, 12])
  })

  it('excludes already-booked slots', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 60,
      bookedTimes: [new Date(2024, 0, 1, 10, 0)],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots.map(s => s.getHours())).toEqual([9, 11, 12])
  })

  it('excludes slots inside the minimum lead time', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday, // 8:00
      daysAhead: 1,
      minLeadMinutes: 120, // earliest allowed = 10:00
    })
    expect(slots.map(s => s.getHours())).toEqual([10, 11, 12])
  })

  it('projects slots across multiple days honoring day-of-week', () => {
    const slots = getAvailableSlots({
      hours: [
        { dayOfWeek: 1, opensMinute: 540, closesMinute: 600 }, // Monday 9-10
        { dayOfWeek: 3, opensMinute: 540, closesMinute: 600 }, // Wednesday 9-10
      ],
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 7,
      minLeadMinutes: 0,
    })
    expect(slots).toHaveLength(2)
    expect(slots[0].getDay()).toBe(1)
    expect(slots[1].getDay()).toBe(3)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest lib/availability.test.ts`
Expected: FAIL — `Cannot find module './availability'`

- [ ] **Step 3: Create `lib/availability.ts`**

```ts
export interface WorkshopHoursWindow {
  dayOfWeek: number
  opensMinute: number
  closesMinute: number
}

export interface GetAvailableSlotsParams {
  hours: WorkshopHoursWindow[]
  slotDurationMinutes: number
  bookedTimes: Date[]
  now: Date
  daysAhead?: number
  minLeadMinutes?: number
}

export function getAvailableSlots({
  hours,
  slotDurationMinutes,
  bookedTimes,
  now,
  daysAhead = 14,
  minLeadMinutes = 120,
}: GetAvailableSlotsParams): Date[] {
  const bookedTimestamps = new Set(bookedTimes.map(d => d.getTime()))
  const earliestAllowed = new Date(now.getTime() + minLeadMinutes * 60_000)
  const slots: Date[] = []

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
    const dayWindows = hours.filter(h => h.dayOfWeek === day.getDay())

    for (const window of dayWindows) {
      for (
        let minute = window.opensMinute;
        minute + slotDurationMinutes <= window.closesMinute;
        minute += slotDurationMinutes
      ) {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute)
        if (slotStart < earliestAllowed) continue
        if (bookedTimestamps.has(slotStart.getTime())) continue
        slots.push(slotStart)
      }
    }
  }

  return slots
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest lib/availability.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/availability.ts lib/availability.test.ts
git commit -m "feat: add workshop availability slot computation"
```

---

### Task 4: `lib/workshopSpecialty.ts` — Shared Spanish labels

**Files:**
- Create: `lib/workshopSpecialty.ts`

**Interfaces:**
- Consumes: `WorkshopSpecialty` enum from `@prisma/client` (Task 1)
- Produces: `WORKSHOP_SPECIALTY_LABELS: Record<WorkshopSpecialty, string>`, `WORKSHOP_SPECIALTY_OPTIONS: { value: WorkshopSpecialty; label: string }[]`

- [ ] **Step 1: Create `lib/workshopSpecialty.ts`**

```ts
import { WorkshopSpecialty } from '@prisma/client'

export const WORKSHOP_SPECIALTY_LABELS: Record<WorkshopSpecialty, string> = {
  MECANICA_GENERAL: 'Mecánica general',
  ELECTRICIDAD_AUTOMOTRIZ: 'Electricidad automotriz',
  CHAPA_Y_PINTURA: 'Chapa y pintura',
  NEUMATICOS_Y_LLANTAS: 'Neumáticos y llantas',
  DIAGNOSTICO_ELECTRONICO: 'Diagnóstico electrónico',
  TRANSMISION: 'Transmisión',
  AIRE_ACONDICIONADO: 'Aire acondicionado',
  OTRO: 'Otro',
}

export const WORKSHOP_SPECIALTY_OPTIONS = Object.values(WorkshopSpecialty).map(value => ({
  value,
  label: WORKSHOP_SPECIALTY_LABELS[value],
}))
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `workshopSpecialty.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/workshopSpecialty.ts
git commit -m "feat: add shared workshop specialty labels"
```

---

### Task 5: `GET /api/workshops/search` — Distance-sorted, specialty-filtered search

**Files:**
- Create: `app/api/workshops/search/route.ts`

**Interfaces:**
- Consumes: `haversineDistanceKm` from `lib/geo.ts` (Task 2)
- Produces: `GET` handler returning `{ id, name, address, phone, specialties: string[], latitude: number|null, longitude: number|null, distanceKm: number|null }[]`, sorted by distance (nulls last, then alphabetical).

- [ ] **Step 1: Create `app/api/workshops/search/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { haversineDistanceKm } from '@/lib/geo'
import { WorkshopSpecialty } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const specialty = searchParams.get('specialty')
  const q = searchParams.get('q')

  const userLat = lat !== null ? Number(lat) : null
  const userLng = lng !== null ? Number(lng) : null

  if (specialty && !(Object.values(WorkshopSpecialty) as string[]).includes(specialty)) {
    return NextResponse.json({ error: 'Invalid specialty' }, { status: 400 })
  }

  const workshops = await prisma.workshop.findMany({
    where: {
      ...(specialty ? { specialties: { has: specialty as WorkshopSpecialty } } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  const withDistance = workshops.map(w => ({
    id: w.id,
    name: w.name,
    address: w.address,
    phone: w.phone,
    specialties: w.specialties,
    latitude: w.latitude,
    longitude: w.longitude,
    distanceKm:
      userLat !== null && userLng !== null && w.latitude !== null && w.longitude !== null
        ? haversineDistanceKm({ lat: userLat, lng: userLng }, { lat: w.latitude, lng: w.longitude })
        : null,
  }))

  withDistance.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name)
    if (a.distanceKm === null) return 1
    if (b.distanceKm === null) return -1
    return a.distanceKm - b.distanceKm
  })

  return NextResponse.json(withDistance)
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, then in another terminal: `curl http://localhost:3000/api/workshops/search` while logged in (or via the browser once authenticated).
Expected: `401` when logged out; a JSON array (possibly empty) when logged in.

- [ ] **Step 3: Commit**

```bash
git add app/api/workshops/search/route.ts
git commit -m "feat: add distance-sorted workshop search API"
```

---

### Task 6: `GET /api/workshops/[id]/availability` — Available slots for booking

**Files:**
- Create: `app/api/workshops/[id]/availability/route.ts`

**Interfaces:**
- Consumes: `getAvailableSlots` from `lib/availability.ts` (Task 3)
- Produces: `GET` handler returning `{ slots: string[] }` (ISO datetime strings) for the next 14 days.

- [ ] **Step 1: Create `app/api/workshops/[id]/availability/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const workshop = await prisma.workshop.findUnique({
    where: { id },
    include: { hours: true },
  })
  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
  }

  const now = new Date()
  const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const existing = await prisma.appointment.findMany({
    where: {
      workshopId: id,
      status: { not: 'CANCELLED' },
      scheduledAt: { gte: now, lte: rangeEnd },
    },
    select: { scheduledAt: true },
  })

  const slots = getAvailableSlots({
    hours: workshop.hours,
    slotDurationMinutes: workshop.slotDurationMinutes,
    bookedTimes: existing.map(e => e.scheduledAt),
    now,
  })

  return NextResponse.json({ slots: slots.map(s => s.toISOString()) })
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`, then `curl http://localhost:3000/api/workshops/<a-real-workshop-id>/availability` while logged in.
Expected: `{"slots":[]}` for a workshop with no configured hours yet (expected until Task 12 is done); `404` for a bogus id.

- [ ] **Step 3: Commit**

```bash
git add "app/api/workshops/[id]/availability/route.ts"
git commit -m "feat: add workshop availability API"
```

---

### Task 7: `PATCH /api/workshop` — Mechanic updates specialties/location/hours

**Files:**
- Modify: `app/api/workshop/route.ts`

**Interfaces:**
- Consumes: `WorkshopSpecialty` from `@prisma/client`
- Produces: `PATCH` handler accepting `{ specialties?: string[]; slotDurationMinutes?: number; address?: string; latitude?: number; longitude?: number; googlePlaceId?: string|null; hours?: { dayOfWeek: number; opensMinute: number; closesMinute: number }[] }`, returns the updated `Workshop`.

- [ ] **Step 1: Add the PATCH handler to `app/api/workshop/route.ts`** (keep the existing `POST` handler as-is; append this)

```ts
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { specialties, slotDurationMinutes, latitude, longitude, googlePlaceId, address, hours } = body

  if (specialties !== undefined) {
    if (!Array.isArray(specialties)) {
      return NextResponse.json({ error: 'specialties must be an array' }, { status: 400 })
    }
    const valid = Object.values(WorkshopSpecialty) as string[]
    if (specialties.some((s: string) => !valid.includes(s))) {
      return NextResponse.json({ error: 'Invalid specialty value' }, { status: 400 })
    }
  }

  if (hours !== undefined) {
    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: 'hours must be an array' }, { status: 400 })
    }
    for (const h of hours) {
      if (
        typeof h.dayOfWeek !== 'number' || h.dayOfWeek < 0 || h.dayOfWeek > 6 ||
        typeof h.opensMinute !== 'number' || typeof h.closesMinute !== 'number' ||
        h.opensMinute < 0 || h.closesMinute > 1440 || h.opensMinute >= h.closesMinute
      ) {
        return NextResponse.json({ error: 'Invalid hours entry' }, { status: 400 })
      }
    }
  }

  try {
    const workshop = await prisma.$transaction(async (tx) => {
      const updated = await tx.workshop.update({
        where: { id: session.user.workshopId! },
        data: {
          ...(specialties !== undefined ? { specialties } : {}),
          ...(slotDurationMinutes !== undefined ? { slotDurationMinutes } : {}),
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
          ...(address !== undefined ? { address } : {}),
        },
      })

      if (hours !== undefined) {
        await tx.workshopHours.deleteMany({ where: { workshopId: updated.id } })
        if (hours.length > 0) {
          await tx.workshopHours.createMany({
            data: hours.map((h: { dayOfWeek: number; opensMinute: number; closesMinute: number }) => ({
              workshopId: updated.id,
              dayOfWeek: h.dayOfWeek,
              opensMinute: h.opensMinute,
              closesMinute: h.closesMinute,
            })),
          })
        }
      }

      return updated
    })

    return NextResponse.json(workshop)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Add the missing import at the top of `app/api/workshop/route.ts`**

The file already imports `NextResponse`, `getServerSession`, `authOptions`, `prisma`. Add:

```ts
import { WorkshopSpecialty } from '@prisma/client'
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`, log in as a mechanic with a workshop, then:
```bash
curl -X PATCH http://localhost:3000/api/workshop \
  -H "Content-Type: application/json" \
  -b "<your session cookie>" \
  -d '{"specialties":["MECANICA_GENERAL"],"hours":[{"dayOfWeek":1,"opensMinute":540,"closesMinute":1020}]}'
```
Expected: `200` with the updated workshop JSON (this is easiest to verify end-to-end once Task 12's settings UI exists — this manual curl check is a sanity check on the route in isolation).

- [ ] **Step 4: Commit**

```bash
git add app/api/workshop/route.ts
git commit -m "feat: add workshop settings update endpoint"
```

---

### Task 8: `POST /api/appointments` — Require workshop, validate slot, prevent double-booking

**Files:**
- Modify: `app/api/appointments/route.ts`

**Interfaces:**
- Consumes: `getAvailableSlots` from `lib/availability.ts` (Task 3)
- Produces: `POST` handler now requires `workshopId`; returns `409` if the requested `scheduledAt` isn't a currently open slot, or if the DB unique constraint (Task 1) catches a race.

- [ ] **Step 1: Replace `app/api/appointments/route.ts` with the following complete file**

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { vehicleId, workshopId, title, scheduledAt, notes } = await request.json()

  if (!vehicleId || !workshopId || !title || !scheduledAt) {
    return NextResponse.json(
      { error: 'vehicleId, workshopId, title, and scheduledAt are required' },
      { status: 400 }
    )
  }

  const parsedDate = new Date(scheduledAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 })
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle || vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    include: { hours: true },
  })
  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
  }

  const existing = await prisma.appointment.findMany({
    where: { workshopId, status: { not: 'CANCELLED' } },
    select: { scheduledAt: true },
  })

  const validSlots = getAvailableSlots({
    hours: workshop.hours,
    slotDurationMinutes: workshop.slotDurationMinutes,
    bookedTimes: existing.map(e => e.scheduledAt),
    now: new Date(),
  })
  const isValidSlot = validSlots.some(s => s.getTime() === parsedDate.getTime())
  if (!isValidSlot) {
    return NextResponse.json({ error: 'El horario seleccionado ya no está disponible' }, { status: 409 })
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        title,
        scheduledAt: parsedDate,
        notes: notes || null,
        vehicleId,
        workshopId,
      },
    })
    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'El horario seleccionado ya no está disponible' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. As an owner with a registered vehicle, POST to `/api/appointments` with a `scheduledAt` that is NOT one of the workshop's open slots.
Expected: `409` with `{"error":"El horario seleccionado ya no está disponible"}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/appointments/route.ts
git commit -m "feat: validate appointment slot availability and prevent double-booking"
```

---

### Task 9: `DashboardNav` — Configurable nav items (backward-compatible)

**Files:**
- Modify: `components/shared/DashboardNav.tsx`

**Interfaces:**
- Produces: `DashboardNavItem { key: string; href: string; label: string }`; `DashboardNav({ userName, userEmail, userImage, items = <owner items>, active = 'panel' }: { items?: DashboardNavItem[]; active?: string; ... })` — `items`/`active` are now optional and default to the current owner-only links, so **all 4 existing call sites (`owner/page.tsx`, `owner/schedule/page.tsx`, `owner/profile/page.tsx`, `owner/vehicles/new/page.tsx`) keep working unmodified.**

- [ ] **Step 1: Replace `components/shared/DashboardNav.tsx` with the following complete file**

```tsx
import Link from 'next/link'
import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import { cn } from '@/lib/utils'

export interface DashboardNavItem {
  key: string
  href: string
  label: string
}

const DEFAULT_OWNER_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/owner', label: 'Panel' },
  { key: 'schedule', href: '/owner/schedule', label: 'Agendar' },
]

export function DashboardNav({
  userName,
  userEmail,
  userImage,
  items = DEFAULT_OWNER_NAV_ITEMS,
  active = 'panel',
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
  items?: DashboardNavItem[]
  active?: string
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tight text-primary font-mono">
          VetCar
        </span>
        <nav className="flex items-center gap-4 ml-4">
          {items.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'text-sm transition-colors cursor-pointer',
                active === item.key
                  ? 'text-primary border-b-2 border-primary pb-1.5'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity"><BellIcon /></button>
          <button className="p-1 hover:opacity-70 transition-opacity"><GearIcon /></button>
        </div>
        <AvatarMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Manually verify nothing broke**

Run: `npm run dev`, log in as an owner, visit `/owner`, `/owner/schedule`, `/owner/profile`, `/owner/vehicles/new`.
Expected: nav renders identically to before (Panel / Agendar tabs, correct active tab highlighted).

- [ ] **Step 3: Commit**

```bash
git add components/shared/DashboardNav.tsx
git commit -m "refactor: make DashboardNav items configurable for reuse on the mechanic dashboard"
```

---

### Task 10: Google Maps provider + shadcn Checkbox

**Files:**
- Create: `components/shared/GoogleMapsProvider.tsx`
- Create: `components/ui/checkbox.tsx`
- Modify: `.env.example`

**Interfaces:**
- Produces: `hasGoogleMapsKey: boolean`, `GoogleMapsProvider({ children }: { children: React.ReactNode })`; `Checkbox` (shadcn primitive, `checked`/`onCheckedChange` props).

- [ ] **Step 1: Install `@vis.gl/react-google-maps`**

Run: `npm install @vis.gl/react-google-maps`
Expected: added to `package.json` dependencies, version `^1.9.0`.

- [ ] **Step 2: Add the env var to `.env.example`**

Add this line (with the comment above it) to the existing `.env.example`:

```
# Google Cloud Console (console.cloud.google.com) → enable "Maps JavaScript API",
# "Places API (New)", and "Geocoding API" on the same project, create an API key,
# and restrict it by HTTP referrer (localhost:3000 for dev, your prod domain for prod).
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

- [ ] **Step 3: Create `components/shared/GoogleMapsProvider.tsx`**

```tsx
'use client'

import { APIProvider } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

export const hasGoogleMapsKey = Boolean(GOOGLE_MAPS_API_KEY)

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_MAPS_API_KEY) return <>{children}</>

  return <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>{children}</APIProvider>
}
```

- [ ] **Step 4: Add the shadcn Checkbox component**

Run: `npx shadcn@latest add checkbox`

If the CLI isn't available in your environment, create `components/ui/checkbox.tsx` manually with this exact content instead:

```tsx
'use client'

import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { CheckIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example components/shared/GoogleMapsProvider.tsx components/ui/checkbox.tsx
git commit -m "feat: add Google Maps provider and Checkbox primitive"
```

---

### Task 11: Places Autocomplete search input (with manual fallback)

**Files:**
- Create: `lib/useAutocompleteSuggestions.ts`
- Create: `components/shared/PlaceLocationInput.tsx`

**Interfaces:**
- Consumes: `hasGoogleMapsKey` from `components/shared/GoogleMapsProvider.tsx` (Task 10)
- Produces: `useAutocompleteSuggestions(inputString: string, requestOptions?: Partial<google.maps.places.AutocompleteRequest>): { suggestions: google.maps.places.AutocompleteSuggestion[]; isLoading: boolean; resetSession: () => void }`; `PlaceLocationValue { address: string; latitude: number; longitude: number; googlePlaceId: string | null }`; `PlaceLocationInput({ onSelect, initialAddress?, initialLatitude?, initialLongitude? }: { onSelect: (value: PlaceLocationValue) => void; initialAddress?: string; initialLatitude?: number | null; initialLongitude?: number | null })`.

This uses the Places API (New) **Autocomplete Data API** (`AutocompleteSuggestion.fetchAutocompleteSuggestions` + `placePrediction.toPlace().fetchFields(...)`), not the legacy `google.maps.places.Autocomplete` widget — Google stopped offering the legacy widget to new Cloud projects as of March 2025, and this project has no existing project to grandfather in.

- [ ] **Step 1: Create `lib/useAutocompleteSuggestions.ts`**

```ts
import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'

export interface UseAutocompleteSuggestionsReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[]
  isLoading: boolean
  resetSession: () => void
}

export function useAutocompleteSuggestions(
  inputString: string,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places')

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!placesLib) return

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken()
    }

    if (inputString === '') {
      setSuggestions([])
      return
    }

    const request: google.maps.places.AutocompleteRequest = {
      ...requestOptions,
      input: inputString,
      sessionToken: sessionTokenRef.current,
    }

    setIsLoading(true)
    AutocompleteSuggestion.fetchAutocompleteSuggestions(request).then(res => {
      setSuggestions(res.suggestions)
      setIsLoading(false)
    })
  }, [placesLib, inputString])

  return {
    suggestions,
    isLoading,
    resetSession: () => {
      sessionTokenRef.current = null
      setSuggestions([])
    },
  }
}
```

- [ ] **Step 2: Create `components/shared/PlaceLocationInput.tsx`**

```tsx
'use client'

import { useCallback, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { useAutocompleteSuggestions } from '@/lib/useAutocompleteSuggestions'
import { Input } from '@/components/ui/input'
import { hasGoogleMapsKey } from './GoogleMapsProvider'

export interface PlaceLocationValue {
  address: string
  latitude: number
  longitude: number
  googlePlaceId: string | null
}

interface PlaceLocationInputProps {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress?: string
  initialLatitude?: number | null
  initialLongitude?: number | null
}

export function PlaceLocationInput({
  onSelect,
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
}: PlaceLocationInputProps) {
  if (!hasGoogleMapsKey) {
    return (
      <ManualLocationInput
        onSelect={onSelect}
        initialAddress={initialAddress}
        initialLatitude={initialLatitude}
        initialLongitude={initialLongitude}
      />
    )
  }
  return <AutocompleteLocationInput onSelect={onSelect} initialAddress={initialAddress} />
}

function AutocompleteLocationInput({
  onSelect,
  initialAddress,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
}) {
  const places = useMapsLibrary('places')
  const [inputValue, setInputValue] = useState(initialAddress)
  const { suggestions, resetSession } = useAutocompleteSuggestions(inputValue)

  const handleSuggestionClick = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!places || !suggestion.placePrediction) return

      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['location', 'formattedAddress', 'id'] })

      if (!place.location) return

      setInputValue(place.formattedAddress ?? '')
      resetSession()

      onSelect({
        address: place.formattedAddress ?? '',
        latitude: place.location.lat(),
        longitude: place.location.lng(),
        googlePlaceId: place.id,
      })
    },
    [places, onSelect, resetSession]
  )

  return (
    <div className="relative flex flex-col gap-1.5">
      <Input
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder="Buscá tu taller en Google Maps"
        className="h-11"
      />
      {suggestions.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
            >
              {suggestion.placePrediction?.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ManualLocationInput({
  onSelect,
  initialAddress,
  initialLatitude,
  initialLongitude,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
  initialLatitude: number | null
  initialLongitude: number | null
}) {
  const [address, setAddress] = useState(initialAddress)
  const [latitude, setLatitude] = useState(initialLatitude !== null ? String(initialLatitude) : '')
  const [longitude, setLongitude] = useState(initialLongitude !== null ? String(initialLongitude) : '')

  function emitIfComplete(next: { address: string; latitude: string; longitude: string }) {
    const lat = Number(next.latitude)
    const lng = Number(next.longitude)
    if (next.address && !Number.isNaN(lat) && !Number.isNaN(lng) && next.latitude !== '' && next.longitude !== '') {
      onSelect({ address: next.address, latitude: lat, longitude: lng, googlePlaceId: null })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={address}
        onChange={e => {
          setAddress(e.target.value)
          emitIfComplete({ address: e.target.value, latitude, longitude })
        }}
        placeholder="Dirección del taller"
        className="h-11"
      />
      <div className="flex gap-2">
        <Input
          value={latitude}
          onChange={e => {
            setLatitude(e.target.value)
            emitIfComplete({ address, latitude: e.target.value, longitude })
          }}
          placeholder="Latitud"
          type="number"
          step="any"
          className="h-11"
        />
        <Input
          value={longitude}
          onChange={e => {
            setLongitude(e.target.value)
            emitIfComplete({ address, latitude, longitude: e.target.value })
          }}
          placeholder="Longitud"
          type="number"
          step="any"
          className="h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Google Maps no está configurado. Ingresá la dirección y las coordenadas manualmente (podés obtenerlas
        haciendo clic derecho en Google Maps y copiando "Latitud, Longitud").
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/useAutocompleteSuggestions.ts components/shared/PlaceLocationInput.tsx
git commit -m "feat: add Places Autocomplete location input with manual fallback"
```

---

### Task 12: Mechanic dashboard nav + workshop settings page

**Files:**
- Create: `app/(dashboard)/mechanic/nav-items.ts`
- Modify: `app/(dashboard)/mechanic/page.tsx`
- Create: `app/(dashboard)/mechanic/settings/page.tsx`
- Create: `app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx`

**Interfaces:**
- Consumes: `DashboardNav`/`DashboardNavItem` (Task 9), `WORKSHOP_SPECIALTY_OPTIONS` (Task 4), `PlaceLocationInput`/`PlaceLocationValue` (Task 11), `GoogleMapsProvider` (Task 10), `Checkbox` (Task 10), `PATCH /api/workshop` (Task 7).
- Produces: `/mechanic/settings` route.

- [ ] **Step 1: Create `app/(dashboard)/mechanic/nav-items.ts`**

```ts
import type { DashboardNavItem } from '@/components/shared/DashboardNav'

export const MECHANIC_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/mechanic', label: 'Panel' },
  { key: 'settings', href: '/mechanic/settings', label: 'Configuración' },
]
```

- [ ] **Step 2: Replace `app/(dashboard)/mechanic/page.tsx` with the following complete file**

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from './nav-items'

export default async function MechanicDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="panel"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-16 flex items-center justify-center">
        <h1 className="text-2xl font-semibold text-foreground font-mono">Panel del mecánico</h1>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/mechanic/settings/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { WorkshopSettingsForm } from './WorkshopSettingsForm'

export default async function MechanicSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const [workshop, userImage] = await Promise.all([
    prisma.workshop.findUnique({
      where: { id: session.user.workshopId },
      include: { hours: true },
    }),
    getUserImage(session.user.id),
  ])
  if (!workshop) redirect('/workshop/setup')

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="settings"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-16 px-8 py-12">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] uppercase font-mono">
            Configuración del taller
          </h1>
          <WorkshopSettingsForm
            initialSpecialties={workshop.specialties}
            initialSlotDurationMinutes={workshop.slotDurationMinutes}
            initialAddress={workshop.address}
            initialLatitude={workshop.latitude}
            initialLongitude={workshop.longitude}
            initialHours={workshop.hours.map(h => ({
              dayOfWeek: h.dayOfWeek,
              opensMinute: h.opensMinute,
              closesMinute: h.closesMinute,
            }))}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx`**

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'
import { PlaceLocationInput, type PlaceLocationValue } from '@/components/shared/PlaceLocationInput'
import { GoogleMapsProvider } from '@/components/shared/GoogleMapsProvider'

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const SLOT_DURATIONS = [30, 45, 60, 90, 120]

interface DayRow {
  dayOfWeek: number
  enabled: boolean
  opensTime: string
  closesTime: string
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

interface WorkshopSettingsFormProps {
  initialSpecialties: string[]
  initialSlotDurationMinutes: number
  initialAddress: string
  initialLatitude: number | null
  initialLongitude: number | null
  initialHours: { dayOfWeek: number; opensMinute: number; closesMinute: number }[]
}

export function WorkshopSettingsForm({
  initialSpecialties,
  initialSlotDurationMinutes,
  initialAddress,
  initialLatitude,
  initialLongitude,
  initialHours,
}: WorkshopSettingsFormProps) {
  const router = useRouter()
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties)
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes)
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: initialAddress,
    latitude: initialLatitude ?? 0,
    longitude: initialLongitude ?? 0,
    googlePlaceId: null,
  })
  const [hasLocation, setHasLocation] = useState(initialLatitude !== null && initialLongitude !== null)
  const [days, setDays] = useState<DayRow[]>(() =>
    DAY_ORDER.map(dayOfWeek => {
      const existing = initialHours.find(h => h.dayOfWeek === dayOfWeek)
      return {
        dayOfWeek,
        enabled: Boolean(existing),
        opensTime: existing ? minutesToTime(existing.opensMinute) : '09:00',
        closesTime: existing ? minutesToTime(existing.closesMinute) : '18:00',
      }
    })
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggleSpecialty(value: string) {
    setSpecialties(prev => (prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]))
  }

  function updateDay(dayOfWeek: number, patch: Partial<DayRow>) {
    setDays(prev => prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const enabledDays = days.filter(d => d.enabled)
    for (const d of enabledDays) {
      if (timeToMinutes(d.opensTime) >= timeToMinutes(d.closesTime)) {
        setError(`El horario de ${DAY_LABELS[d.dayOfWeek]} es inválido: el cierre debe ser después de la apertura.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/workshop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties,
          slotDurationMinutes,
          address: location.address,
          latitude: hasLocation ? location.latitude : undefined,
          longitude: hasLocation ? location.longitude : undefined,
          googlePlaceId: location.googlePlaceId,
          hours: enabledDays.map(d => ({
            dayOfWeek: d.dayOfWeek,
            opensMinute: timeToMinutes(d.opensTime),
            closesMinute: timeToMinutes(d.closesTime),
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo guardar la configuración')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Especialidades</h2>
          <div className="grid grid-cols-2 gap-2">
            {WORKSHOP_SPECIALTY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox
                  checked={specialties.includes(opt.value)}
                  onCheckedChange={() => toggleSpecialty(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Ubicación</h2>
          <GoogleMapsProvider>
            <PlaceLocationInput
              initialAddress={initialAddress}
              initialLatitude={initialLatitude}
              initialLongitude={initialLongitude}
              onSelect={value => {
                setLocation(value)
                setHasLocation(true)
              }}
            />
          </GoogleMapsProvider>
          {!hasLocation && (
            <p className="text-xs text-muted-foreground">
              Todavía no configuraste la ubicación del taller: no vas a aparecer en el mapa de búsqueda hasta que lo hagas.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Duración del turno</h2>
          <Select value={String(slotDurationMinutes)} onValueChange={v => setSlotDurationMinutes(Number(v))}>
            <SelectTrigger className="h-11 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_DURATIONS.map(d => (
                <SelectItem key={d} value={String(d)}>{d} minutos</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Horario de atención</h2>
          <div className="flex flex-col gap-2">
            {days.map(day => (
              <div key={day.dayOfWeek} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-32 text-sm text-foreground cursor-pointer shrink-0">
                  <Checkbox
                    checked={day.enabled}
                    onCheckedChange={checked => updateDay(day.dayOfWeek, { enabled: checked === true })}
                  />
                  {DAY_LABELS[day.dayOfWeek]}
                </label>
                <Input
                  type="time"
                  value={day.opensTime}
                  disabled={!day.enabled}
                  onChange={e => updateDay(day.dayOfWeek, { opensTime: e.target.value })}
                  className="h-9 w-32"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="time"
                  value={day.closesTime}
                  disabled={!day.enabled}
                  onChange={e => updateDay(day.dayOfWeek, { closesTime: e.target.value })}
                  className="h-9 w-32"
                />
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        {saved && <p className="text-sm text-primary">Configuración guardada.</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="h-11 px-6">
            {submitting ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </MotionConfig>
  )
}
```

- [ ] **Step 5: Manually verify**

Run: `npm run dev`. Log in as a mechanic. Visit `/mechanic` — confirm the nav now shows "Panel" / "Configuración" tabs. Click "Configuración", check specialty boxes, set a location (manual lat/lng fallback since no API key yet), toggle a couple of days with hours, and save.
Expected: "Configuración guardada." message; reloading the page shows the saved values persisted (re-fetched via `prisma.workshop.findUnique`).

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/mechanic"
git commit -m "feat: add mechanic workshop settings page"
```

---

### Task 13: Owner schedule — real map, geolocation, search & specialty filter

**Files:**
- Modify: `app/(dashboard)/owner/schedule/page.tsx`
- Modify: `app/(dashboard)/owner/schedule/ScheduleView.tsx`

**Interfaces:**
- Consumes: `GET /api/workshops/search` (Task 5), `GoogleMapsProvider`/`hasGoogleMapsKey` (Task 10), `WORKSHOP_SPECIALTY_LABELS`/`WORKSHOP_SPECIALTY_OPTIONS` (Task 4).
- Produces: updated `Workshop` client type `{ id, name, address, phone, specialties: string[], latitude: number|null, longitude: number|null, distanceKm: number|null }`, used by Task 14's booking modal too.

- [ ] **Step 1: Replace `app/(dashboard)/owner/schedule/page.tsx` with the following complete file**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { ScheduleView } from './ScheduleView'

export default async function SchedulePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const [rawWorkshops, rawVehicles, userImage] = await Promise.all([
    prisma.workshop.findMany({ orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    getUserImage(session.user.id),
  ])

  const workshops = rawWorkshops.map(w => ({
    id: w.id,
    name: w.name,
    address: w.address,
    phone: w.phone,
    specialties: w.specialties as string[],
    latitude: w.latitude,
    longitude: w.longitude,
    distanceKm: null as number | null,
  }))

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        active="schedule"
      />
      <ScheduleView workshops={workshops} vehicles={vehicles} />
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(dashboard)/owner/schedule/ScheduleView.tsx` with the following (this is an interim version — Task 14 will replace the `BookingModal` function inside this same file with an availability-aware one; everything else here is final)**

```tsx
'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { cn } from '@/lib/utils'
import {
  MapPinIcon, ServiceIcon,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Map, Marker, useMapsLibrary } from '@vis.gl/react-google-maps'
import { GoogleMapsProvider, hasGoogleMapsKey } from '@/components/shared/GoogleMapsProvider'
import { WORKSHOP_SPECIALTY_LABELS, WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'

const MotionButton = motion.create(Button)

type Workshop = {
  id: string
  name: string
  address: string
  phone: string
  specialties: string[]
  latitude: number | null
  longitude: number | null
  distanceKm: number | null
}
type VehicleOption = { id: string; label: string }
type LatLng = { lat: number; lng: number }

interface ScheduleViewProps {
  workshops: Workshop[]
  vehicles: VehicleOption[]
}

function centroidOf(points: { latitude: number; longitude: number }[]): LatLng | null {
  if (points.length === 0) return null
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

function MapPanel({
  workshops,
  userLocation,
  onSelectWorkshop,
}: {
  workshops: Workshop[]
  userLocation: LatLng | null
  onSelectWorkshop: (workshop: Workshop) => void
}) {
  const located = workshops.filter(
    (w): w is Workshop & { latitude: number; longitude: number } => w.latitude !== null && w.longitude !== null
  )
  const defaultCenter = userLocation ?? centroidOf(located) ?? { lat: 0, lng: 0 }

  return (
    <Map
      defaultZoom={userLocation ? 13 : 4}
      defaultCenter={defaultCenter}
      gestureHandling="greedy"
      disableDefaultUI
      className="w-full h-full"
    >
      {userLocation && <Marker position={userLocation} title="Tu ubicación" />}
      {located.map(w => (
        <Marker
          key={w.id}
          position={{ lat: w.latitude, lng: w.longitude }}
          title={w.name}
          clickable
          onClick={() => onSelectWorkshop(w)}
        />
      ))}
    </Map>
  )
}

function LocationSearchField({ onLocate }: { onLocate: (coords: LatLng) => void }) {
  const geocodingLib = useMapsLibrary('geocoding')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!geocodingLib || !value.trim()) return
    setError(false)
    const geocoder = new geocodingLib.Geocoder()
    try {
      const { results } = await geocoder.geocode({ address: value })
      const first = results[0]
      if (!first) {
        setError(true)
        return
      }
      onLocate({ lat: first.geometry.location.lat(), lng: first.geometry.location.lng() })
    } catch {
      setError(true)
    }
  }, [geocodingLib, value, onLocate])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <MapPinIcon />
      </span>
      <Input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
          }
        }}
        placeholder="Ubicación (p. ej. Palermo, CABA)"
        className="w-72 h-10 pl-9"
      />
      {error && <p className="absolute top-full mt-1 text-xs text-destructive-foreground">No encontramos esa ubicación.</p>}
    </div>
  )
}

function ShopCard({
  workshop, index, isSelected, onSelect, onBook,
}: {
  workshop: Workshop; index: number; isSelected: boolean; onSelect: () => void; onBook: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: index * 0.06 }}
      whileHover={{ y: -2, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      onClick={onSelect}
    >
      <Card className={cn('p-[1.0625rem] gap-2 cursor-pointer', isSelected && 'ring-2 ring-primary')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-lg font-bold text-foreground">{workshop.name}</span>
            <span className="text-sm text-muted-foreground">{workshop.address}</span>
            <span className="text-xs text-muted-foreground">Tel: {workshop.phone}</span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {workshop.distanceKm !== null ? (
              <Badge variant="idle">{workshop.distanceKm.toFixed(1)} km</Badge>
            ) : workshop.latitude === null ? (
              <Badge variant="outline">Ubicación no disponible</Badge>
            ) : null}
          </div>
        </div>
        {workshop.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workshop.specialties.map(s => (
              <Badge key={s} variant="outline">
                {WORKSHOP_SPECIALTY_LABELS[s as keyof typeof WORKSHOP_SPECIALTY_LABELS] ?? s}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <MotionButton
            onClick={e => { e.stopPropagation(); onBook() }}
            whileHover={{ scale: 1.03, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            variant="outline"
            className="h-8 px-[1.0625rem] border-primary text-primary text-[0.625rem] tracking-[0.05em] uppercase hover:bg-primary/10 hover:text-primary"
          >
            Agendar
          </MotionButton>
        </div>
      </Card>
    </motion.div>
  )
}

function BookingModal({
  workshop, vehicles, onClose,
}: {
  workshop: Workshop
  vehicles: VehicleOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          workshopId: workshop.id,
          title: `Turno en ${workshop.name}`,
          scheduledAt,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="w-full max-w-[420px] p-6 gap-4 rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">Agendar turno</DialogTitle>
        <span className="text-sm text-muted-foreground">{workshop.name}</span>
      </DialogHeader>

      {vehicles.length === 0 ? (
        <div className="flex flex-col gap-3 items-start py-2">
          <span className="text-sm text-muted-foreground">Todavía no tenés vehículos registrados. Registrá uno para poder agendar un turno.</span>
          <Link href="/owner/vehicles/new">
            <Button className="h-10 px-4 text-xs tracking-[0.037em]">Registrar vehículo</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleId" className="text-sm font-medium text-muted-foreground">Vehículo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} required>
              <SelectTrigger id="vehicleId" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledAt" className="text-sm font-medium text-muted-foreground">Fecha y hora</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)} required className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Tipo de servicio / notas (opcional)</Label>
            <Input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
              value={notes} onChange={e => setNotes(e.target.value)} className="h-11" />
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">Cancelar</Button>
            <MotionButton type="submit" disabled={submitting}
              whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
              whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
              className="h-10 px-4 text-xs tracking-[0.037em]">
              {submitting ? 'Agendando…' : 'Confirmar turno'}
            </MotionButton>
          </div>
        </form>
      )}
    </DialogContent>
  )
}

export function ScheduleView({ workshops: initialWorkshops, vehicles }: ScheduleViewProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [specialty, setSpecialty] = useState('all')
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null)
  const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(null)

  const fetchWorkshops = useCallback(async (coords: LatLng | null) => {
    const params = new URLSearchParams()
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
    }
    if (specialty !== 'all') params.set('specialty', specialty)
    const res = await fetch(`/api/workshops/search?${params.toString()}`)
    if (res.ok) setWorkshops(await res.json())
  }, [specialty])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    fetchWorkshops(userLocation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, userLocation])

  function requestGeolocation() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16 flex flex-col overflow-hidden">

        <div className="flex items-center justify-between gap-4 py-4 px-8 bg-[#0c0f0f] border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            {hasGoogleMapsKey ? (
              <GoogleMapsProvider>
                <LocationSearchField onLocate={setUserLocation} />
              </GoogleMapsProvider>
            ) : (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <MapPinIcon />
                </span>
                <Input type="text" disabled placeholder="Búsqueda por ubicación no disponible" className="w-72 h-10 pl-9" />
              </div>
            )}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                <ServiceIcon />
              </span>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="w-64 h-10 pl-9">
                  <SelectValue placeholder="Tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {WORKSHOP_SPECIALTY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={requestGeolocation} className="h-10 px-4 font-mono text-xs tracking-[0.05em] uppercase">
              <MapPinIcon />
              Usar mi ubicación
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-[0_1_533px] min-w-[380px] bg-background border-r border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] uppercase font-mono">Talleres disponibles</h1>
              <span className="text-xs text-muted-foreground tracking-[0.05em] uppercase whitespace-nowrap">{workshops.length} resultados</span>
            </div>

            {workshops.length === 0 ? (
              <div className="flex items-center justify-center text-center py-12 px-4 bg-card border border-dashed border-border rounded-lg">
                <span className="text-sm text-muted-foreground">No encontramos talleres con esos filtros.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {workshops.map((w, i) => (
                  <ShopCard
                    key={w.id}
                    workshop={w}
                    index={i}
                    isSelected={selectedWorkshopId === w.id}
                    onSelect={() => setSelectedWorkshopId(w.id)}
                    onBook={() => setActiveWorkshop(w)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 min-w-[300px] bg-card overflow-hidden">
            {hasGoogleMapsKey ? (
              <GoogleMapsProvider>
                <MapPanel
                  workshops={workshops}
                  userLocation={userLocation}
                  onSelectWorkshop={w => setSelectedWorkshopId(w.id)}
                />
              </GoogleMapsProvider>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center px-8">
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #3c494a 1px, transparent 1px), linear-gradient(to bottom, #3c494a 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                  }}
                />
                <span className="relative text-sm text-muted-foreground max-w-xs">
                  El mapa no está disponible: falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={activeWorkshop !== null} onOpenChange={open => !open && setActiveWorkshop(null)}>
        {activeWorkshop && (
          <BookingModal
            workshop={activeWorkshop}
            vehicles={vehicles}
            onClose={() => setActiveWorkshop(null)}
          />
        )}
      </Dialog>
    </MotionConfig>
  )
}
```

- [ ] **Step 3: Manually verify**

Run: `npm run dev`. Log in as an owner. Visit `/owner/schedule`.
Expected (without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set): the location search input is disabled with the fallback placeholder, the map panel shows the "mapa no disponible" message, the specialty `Select` and "Usar mi ubicación" button still work and re-fetch `/api/workshops/search` (verify in Network tab), and shop cards show specialty badges / "Ubicación no disponible" for any workshop still missing a location.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/owner/schedule"
git commit -m "feat: real map, geolocation, and specialty filter on the schedule screen"
```

---

### Task 14: Booking modal — availability-based date/time slot picker

**Files:**
- Modify: `app/(dashboard)/owner/schedule/ScheduleView.tsx` (replace only the `BookingModal` function and one import line; everything else from Task 13 stays)

**Interfaces:**
- Consumes: `GET /api/workshops/[id]/availability` (Task 6), `POST /api/appointments` (Task 8, now returns 409 on conflict).

- [ ] **Step 1: Update the top import line of `app/(dashboard)/owner/schedule/ScheduleView.tsx`** (adds `useMemo` to the existing React import)

```tsx
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
```

- [ ] **Step 2: Add these two helpers directly above the `BookingModal` function**

```tsx
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function groupSlotsByDate(slots: string[]): Record<string, Date[]> {
  const grouped: Record<string, Date[]> = {}
  for (const iso of slots) {
    const date = new Date(iso)
    const key = dateKey(date)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(date)
  }
  return grouped
}

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
const TIME_LABEL_FORMATTER = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })
```

- [ ] **Step 3: Replace the entire `BookingModal` function with this**

```tsx
function BookingModal({
  workshop, vehicles, onClose,
}: {
  workshop: Workshop
  vehicles: VehicleOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loadingSlots, setLoadingSlots] = useState(true)
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Date[]>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)

  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/availability`)
      const data = await res.json()
      const grouped = groupSlotsByDate((data.slots ?? []) as string[])
      setSlotsByDate(grouped)
      setSelectedDate(prev => prev ?? Object.keys(grouped)[0] ?? null)
    } finally {
      setLoadingSlots(false)
    }
  }, [workshop.id])

  useEffect(() => {
    loadAvailability()
  }, [loadAvailability])

  const next14Days = useMemo(() => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i))
    }
    return days
  }, [])

  const hasAnyAvailability = Object.keys(slotsByDate).length > 0
  const selectedDaySlots = selectedDate ? slotsByDate[selectedDate] ?? [] : []

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedSlot) {
      setError('Elegí un horario disponible.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          workshopId: workshop.id,
          title: `Turno en ${workshop.name}`,
          scheduledAt: selectedSlot.toISOString(),
          notes: notes || undefined,
        }),
      })
      if (res.status === 409) {
        setError('Ese horario ya fue reservado. Elegí otro.')
        setSelectedSlot(null)
        await loadAvailability()
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="w-full max-w-[480px] p-6 gap-4 rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">Agendar turno</DialogTitle>
        <span className="text-sm text-muted-foreground">{workshop.name}</span>
      </DialogHeader>

      {vehicles.length === 0 ? (
        <div className="flex flex-col gap-3 items-start py-2">
          <span className="text-sm text-muted-foreground">Todavía no tenés vehículos registrados. Registrá uno para poder agendar un turno.</span>
          <Link href="/owner/vehicles/new">
            <Button className="h-10 px-4 text-xs tracking-[0.037em]">Registrar vehículo</Button>
          </Link>
        </div>
      ) : loadingSlots ? (
        <p className="text-sm text-muted-foreground py-4">Buscando horarios disponibles…</p>
      ) : !hasAnyAvailability ? (
        <div className="flex flex-col gap-2 py-2">
          <span className="text-sm text-muted-foreground">
            Este taller todavía no configuró su disponibilidad. Contactalo al {workshop.phone} para coordinar un turno.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleId" className="text-sm font-medium text-muted-foreground">Vehículo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} required>
              <SelectTrigger id="vehicleId" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Fecha</Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {next14Days.map(day => {
                const key = dateKey(day)
                const daySlots = slotsByDate[key] ?? []
                const isSelected = selectedDate === key
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={daySlots.length === 0}
                    onClick={() => { setSelectedDate(key); setSelectedSlot(null) }}
                    className={cn(
                      'shrink-0 flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.05em]',
                      daySlots.length === 0
                        ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                        : isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground hover:border-primary/60'
                    )}
                  >
                    {DATE_LABEL_FORMATTER.format(day)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Horario</Label>
            {selectedDaySlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay horarios disponibles ese día.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {selectedDaySlots.map(slot => {
                  const isSelected = selectedSlot?.getTime() === slot.getTime()
                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-xs font-mono',
                        isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/60'
                      )}
                    >
                      {TIME_LABEL_FORMATTER.format(slot)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Tipo de servicio / notas (opcional)</Label>
            <Input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
              value={notes} onChange={e => setNotes(e.target.value)} className="h-11" />
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">Cancelar</Button>
            <MotionButton type="submit" disabled={submitting || !selectedSlot}
              whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
              whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
              className="h-10 px-4 text-xs tracking-[0.037em]">
              {submitting ? 'Agendando…' : 'Confirmar turno'}
            </MotionButton>
          </div>
        </form>
      )}
    </DialogContent>
  )
}
```

- [ ] **Step 4: Manually verify end-to-end**

Run: `npm run dev`. As a mechanic, go to `/mechanic/settings`, enable a couple of days with hours, save. As an owner (with a registered vehicle), go to `/owner/schedule`, click "Agendar" on that workshop.
Expected: "Buscando horarios disponibles…" briefly, then a date strip (only days with configured hours are clickable) and a time-slot grid. Pick a date + time, submit → success, appointment created. Open the same modal again and pick the same slot from two browser tabs to confirm the second submission gets the "Ese horario ya fue reservado" message instead of creating a duplicate.

- [ ] **Step 5: Run the full test suite and lint**

Run: `npx jest && npm run lint`
Expected: all tests pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/owner/schedule/ScheduleView.tsx"
git commit -m "feat: availability-based date/time slot picker for booking"
```

---

## Self-Review Notes

- **Spec coverage:** map navigation + shop selection (Task 13), Google Maps linking research + Places Autocomplete with manual fallback (Task 11, Task 12), default-to-current-location (Task 13's geolocation effect), distance sorting (Task 2 + Task 5), booking modal with calendar/availability (Task 14), specialty search filter (Task 4, 5, 13), new schemas/models analyzed from scratch (Task 1) — all covered.
- **Placeholder scan:** every step has complete, runnable code; no "TODO"/"similar to Task N" left in any step.
- **Type consistency:** the client `Workshop` type (`id, name, address, phone, specialties, latitude, longitude, distanceKm`) is identical across Task 13's `page.tsx` mapping, `GET /api/workshops/search`'s response shape (Task 5), and `ScheduleView.tsx`'s usage (Tasks 13–14). `getAvailableSlots`'s parameter shape is identical between Task 6 and Task 8. `PATCH /api/workshop`'s body fields match `WorkshopSettingsForm`'s submit payload exactly (Task 7 vs. Task 12).
