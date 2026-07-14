# Vehicle Service History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let both vehicle owners and mechanics log a vehicle's maintenance/repair/upgrade history directly (no work order required), with every entry visibly tagged by who logged it.

**Architecture:** One new `HistoryEntry` Prisma model, a shared access-control helper (`lib/vehicleAccess.ts`) used by every read and write path, three mutation API routes (create/edit/delete + a Blob upload token handler), and two nearly-identical page trees (`/owner/vehicles/[id]/...` and `/mechanic/vehicles/[id]/...`) built from two shared UI components so the owner and mechanic experiences never drift apart.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers), Prisma 7, NextAuth 4 (JWT session already carries `id`/`role`/`workshopId`), `@vercel/blob` (new dependency) for photo storage, Jest for API/lib tests.

## Global Constraints

- Reuse the existing `ServiceItemType` enum (REPAIR/MAINTENANCE/UPGRADE/OTHER) — do not invent a new taxonomy.
- `HistoryEntry.source` and `HistoryEntry.workshopId` are always derived server-side from the session — never accepted from the request body.
- Mechanic access is workshop-scoped, not per-mechanic: any mechanic at a workshop that has served a vehicle (via `Appointment` or `WorkOrder`) can read/log its history.
- Edit/delete permission is author-only (`entry.createdById === session.user.id`) — no role-based override.
- One photo per entry, stored via Vercel Blob (public access), not inlined as a data URL.
- `HistoryEntry.workOrderId` is a nullable FK added for future use — no code in this plan sets it. Do not build any WorkOrder create/complete flow.
- All user-facing copy is in Spanish (Latin American), matching every existing page in this app.
- Every new UI must reuse existing primitives from `components/ui/*` and the `bezel`/`bezel-core` layout classes already used throughout the dashboard — do not introduce new visual patterns.
- This repo's test suite covers pure logic and API routes only (see existing `__tests__/api/*.test.ts`) — there is no component-testing setup (no React Testing Library), so UI component tasks in this plan do not add tests, matching existing convention.

**Deviation from the approved spec:** the spec's API table lists `GET /api/vehicles/[id]`. This plan does not create that route. Every existing page in this codebase that reads data (e.g. `app/(dashboard)/owner/page.tsx`, `app/(dashboard)/mechanic/page.tsx`) queries Prisma directly from the Server Component rather than fetching its own API — there is no precedent for a Next.js page calling its own REST endpoint over HTTP, and nothing else would call this route. Instead, the access-checked read lives in `lib/vehicleHistory.ts` as `getVehicleWithHistory()`, called directly by the owner and mechanic detail pages (Tasks 10 and 14). The mutation routes (POST/PATCH/DELETE/upload) are real API routes because client components do call them, consistent with every existing mutation in this app (`POST /api/vehicles`, `POST /api/appointments`, `PATCH /api/workshop`).

---

### Task 1: Schema — `HistoryEntry` model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `HistorySource` enum (`OWNER | MECHANIC`), `HistoryEntry` model with fields `id, vehicleId, type, description, performedAt, odometerReading, cost, photoUrl, source, createdById, workshopId, workOrderId, createdAt, updatedAt`.

- [ ] **Step 1: Add the enum and model to `prisma/schema.prisma`**

Add this enum near the other enums (after `WorkshopSpecialty`):

```prisma
enum HistorySource {
  OWNER
  MECHANIC
}
```

Add this model after `Appointment`:

```prisma
model HistoryEntry {
  id              String          @id @default(cuid())
  vehicleId       String
  type            ServiceItemType
  description     String          @db.Text
  performedAt     DateTime
  odometerReading Int?
  cost            Float?
  photoUrl        String?
  source          HistorySource
  createdById     String
  workshopId      String?
  workOrderId     String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  vehicle   Vehicle    @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  createdBy User       @relation("HistoryEntryAuthor", fields: [createdById], references: [id])
  workshop  Workshop?  @relation(fields: [workshopId], references: [id])
  workOrder WorkOrder? @relation(fields: [workOrderId], references: [id])

  @@index([vehicleId])
}
```

- [ ] **Step 2: Add the back-relations on the four related models**

In `model Vehicle`, add to the relations block (alongside `workOrders` and `appointments`):

```prisma
  historyEntries HistoryEntry[]
```

In `model User`, add alongside `workOrders`:

```prisma
  historyEntries HistoryEntry[] @relation("HistoryEntryAuthor")
```

In `model Workshop`, add alongside `hours`:

```prisma
  historyEntries HistoryEntry[]
```

In `model WorkOrder`, add alongside `serviceItems`:

```prisma
  historyEntries HistoryEntry[]
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: completes with no errors; `HistorySource` and `HistoryEntry` types are now available from `@prisma/client`.

- [ ] **Step 5: Create and apply the migration**

Requires the dev database running — if it isn't, run `docker compose up -d db` first (per `CLAUDE.md`).

Run: `npx prisma migrate dev --name add_history_entry`
Expected: a new folder under `prisma/migrations/` and `Your database is now in sync with your schema.`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add HistoryEntry model for vehicle service history"
```

---

### Task 2: Service item type labels

**Files:**
- Create: `lib/serviceItemType.ts`

**Interfaces:**
- Produces: `SERVICE_ITEM_TYPE_LABELS: Record<ServiceItemType, string>`, `SERVICE_ITEM_TYPE_OPTIONS: { value: ServiceItemType; label: string }[]`

- [ ] **Step 1: Create the labels file**

Mirrors the existing `lib/workshopSpecialty.ts` pattern exactly.

```ts
import { ServiceItemType } from '@prisma/client'

export const SERVICE_ITEM_TYPE_LABELS: Record<ServiceItemType, string> = {
  REPAIR: 'Reparación',
  MAINTENANCE: 'Mantenimiento',
  UPGRADE: 'Mejora',
  OTHER: 'Otro',
}

export const SERVICE_ITEM_TYPE_OPTIONS = Object.values(ServiceItemType).map(value => ({
  value,
  label: SERVICE_ITEM_TYPE_LABELS[value],
}))
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/serviceItemType.ts
git commit -m "feat: add ServiceItemType label map"
```

---

### Task 3: Access control — `lib/vehicleAccess.ts`

**Files:**
- Create: `lib/vehicleAccess.ts`
- Test: `__tests__/lib/vehicleAccess.test.ts`

**Interfaces:**
- Produces:
  - `type SessionUser = { id: string; role: Role; workshopId: string | null }`
  - `canAccessVehicleHistory(user: SessionUser, vehicleId: string): Promise<boolean>`
  - `getWorkshopVehicles(workshopId: string): Promise<(Vehicle & { owner: { name: string | null } })[]>`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/vehicleAccess.test.ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  },
}))

import { canAccessVehicleHistory, getWorkshopVehicles } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

describe('canAccessVehicleHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns true for an owner who owns the vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ ownerId: 'u1' })
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(true)
  })

  it('returns false for an owner who does not own the vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ ownerId: 'someone-else' })
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(false)
  })

  it('returns false for an owner when the vehicle does not exist', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(false)
  })

  it('returns false for a mechanic with no workshop, without querying', async () => {
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'MECHANIC', workshopId: null }, 'v1')
    expect(result).toBe(false)
    expect(prisma.vehicle.findFirst).not.toHaveBeenCalled()
  })

  it('returns true for a mechanic whose workshop has served the vehicle', async () => {
    ;(prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 'v1' })
    const result = await canAccessVehicleHistory({ id: 'm1', role: 'MECHANIC', workshopId: 'ws1' }, 'v1')
    expect(result).toBe(true)
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'v1',
        OR: [
          { appointments: { some: { workshopId: 'ws1' } } },
          { workOrders: { some: { mechanic: { workshopId: 'ws1' } } } },
        ],
      },
      select: { id: true },
    })
  })

  it('returns false for a mechanic whose workshop has never served the vehicle', async () => {
    ;(prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null)
    const result = await canAccessVehicleHistory({ id: 'm1', role: 'MECHANIC', workshopId: 'ws1' }, 'v1')
    expect(result).toBe(false)
  })
})

describe('getWorkshopVehicles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('queries vehicles linked to the workshop via appointments or work orders', async () => {
    ;(prisma.vehicle.findMany as jest.Mock).mockResolvedValue([{ id: 'v1' }])
    const result = await getWorkshopVehicles('ws1')
    expect(result).toEqual([{ id: 'v1' }])
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { appointments: { some: { workshopId: 'ws1' } } },
          { workOrders: { some: { mechanic: { workshopId: 'ws1' } } } },
        ],
      },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/vehicleAccess.test.ts`
Expected: FAIL — `Cannot find module '@/lib/vehicleAccess'`

- [ ] **Step 3: Implement `lib/vehicleAccess.ts`**

```ts
import { Role } from '@prisma/client'
import { prisma } from './prisma'

export type SessionUser = {
  id: string
  role: Role
  workshopId: string | null
}

export async function canAccessVehicleHistory(user: SessionUser, vehicleId: string): Promise<boolean> {
  if (user.role === 'OWNER') {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { ownerId: true } })
    return vehicle?.ownerId === user.id
  }

  if (!user.workshopId) return false

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      OR: [
        { appointments: { some: { workshopId: user.workshopId } } },
        { workOrders: { some: { mechanic: { workshopId: user.workshopId } } } },
      ],
    },
    select: { id: true },
  })
  return vehicle !== null
}

export async function getWorkshopVehicles(workshopId: string) {
  return prisma.vehicle.findMany({
    where: {
      OR: [
        { appointments: { some: { workshopId } } },
        { workOrders: { some: { mechanic: { workshopId } } } },
      ],
    },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/vehicleAccess.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/vehicleAccess.ts __tests__/lib/vehicleAccess.test.ts
git commit -m "feat: add workshop-scoped vehicle access control"
```

---

### Task 4: Vehicle history read/edit helpers — `lib/vehicleHistory.ts`

**Files:**
- Create: `lib/vehicleHistory.ts`
- Test: `__tests__/lib/vehicleHistory.test.ts`

**Interfaces:**
- Consumes: `canAccessVehicleHistory(user, vehicleId): Promise<boolean>` (Task 3), `SessionUser` (Task 3)
- Produces:
  - `type HistoryEntrySummary = { id: string; type: ServiceItemType; description: string; performedAt: string; odometerReading: number | null; cost: number | null; photoUrl: string | null; source: HistorySource; createdById: string; createdByName: string | null; workshopName: string | null }`
  - `type VehicleWithHistory = { id: string; make: string; model: string; year: number; nickname: string | null; plate: string | null; vin: string | null; photoUrl: string | null; historyEntries: HistoryEntrySummary[] }`
  - `getVehicleWithHistory(user: SessionUser, vehicleId: string): Promise<VehicleWithHistory | null>`
  - `getOwnHistoryEntry(userId: string, entryId: string): Promise<HistoryEntry | null>` (raw Prisma row)
  - `parseOptionalNumber(value: unknown): number | null | 'invalid'`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/vehicleHistory.test.ts
jest.mock('@/lib/vehicleAccess', () => ({ canAccessVehicleHistory: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn() },
    historyEntry: { findUnique: jest.fn() },
  },
}))

import { getVehicleWithHistory, getOwnHistoryEntry, parseOptionalNumber } from '@/lib/vehicleHistory'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

const sessionUser = { id: 'u1', role: 'OWNER' as const, workshopId: null }

describe('getVehicleWithHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when access is denied', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(false)
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(result).toBeNull()
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled()
  })

  it('returns null when the vehicle does not exist', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(result).toBeNull()
  })

  it('flattens the vehicle and its history entries, newest performedAt first', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v1', make: 'Honda', model: 'CR-V', year: 2020, nickname: null, plate: 'ABC123', vin: null, photoUrl: null,
      historyEntries: [{
        id: 'h1', type: 'MAINTENANCE', description: 'Cambio de aceite',
        performedAt: new Date('2026-01-01T00:00:00.000Z'),
        odometerReading: 50000, cost: 100, photoUrl: null, source: 'OWNER', createdById: 'u1',
        createdBy: { name: 'Alice' }, workshop: null,
      }],
    })
    const result = await getVehicleWithHistory(sessionUser, 'v1')
    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
      where: { id: 'v1' },
      include: {
        historyEntries: {
          orderBy: { performedAt: 'desc' },
          include: {
            createdBy: { select: { name: true } },
            workshop: { select: { name: true } },
          },
        },
      },
    })
    expect(result?.historyEntries).toEqual([{
      id: 'h1', type: 'MAINTENANCE', description: 'Cambio de aceite',
      performedAt: '2026-01-01T00:00:00.000Z',
      odometerReading: 50000, cost: 100, photoUrl: null, source: 'OWNER', createdById: 'u1',
      createdByName: 'Alice', workshopName: null,
    }])
  })
})

describe('getOwnHistoryEntry', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when the entry does not exist', async () => {
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toBeNull()
  })

  it('returns null when the entry belongs to someone else', async () => {
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toBeNull()
  })

  it('returns the entry when the caller is its author', async () => {
    const entry = { id: 'h1', createdById: 'u1' }
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(entry)
    const result = await getOwnHistoryEntry('u1', 'h1')
    expect(result).toEqual(entry)
  })
})

describe('parseOptionalNumber', () => {
  it('returns null for empty, null, or undefined input', () => {
    expect(parseOptionalNumber('')).toBeNull()
    expect(parseOptionalNumber(null)).toBeNull()
    expect(parseOptionalNumber(undefined)).toBeNull()
  })

  it('returns the parsed number for valid numeric input', () => {
    expect(parseOptionalNumber(50000)).toBe(50000)
    expect(parseOptionalNumber('42.5')).toBe(42.5)
  })

  it('returns "invalid" for non-numeric input', () => {
    expect(parseOptionalNumber('abc')).toBe('invalid')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/vehicleHistory.test.ts`
Expected: FAIL — `Cannot find module '@/lib/vehicleHistory'`

- [ ] **Step 3: Implement `lib/vehicleHistory.ts`**

```ts
import { HistorySource, ServiceItemType } from '@prisma/client'
import { prisma } from './prisma'
import { canAccessVehicleHistory, type SessionUser } from './vehicleAccess'

export type HistoryEntrySummary = {
  id: string
  type: ServiceItemType
  description: string
  performedAt: string
  odometerReading: number | null
  cost: number | null
  photoUrl: string | null
  source: HistorySource
  createdById: string
  createdByName: string | null
  workshopName: string | null
}

export type VehicleWithHistory = {
  id: string
  make: string
  model: string
  year: number
  nickname: string | null
  plate: string | null
  vin: string | null
  photoUrl: string | null
  historyEntries: HistoryEntrySummary[]
}

export async function getVehicleWithHistory(
  user: SessionUser,
  vehicleId: string
): Promise<VehicleWithHistory | null> {
  const hasAccess = await canAccessVehicleHistory(user, vehicleId)
  if (!hasAccess) return null

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      historyEntries: {
        orderBy: { performedAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          workshop: { select: { name: true } },
        },
      },
    },
  })
  if (!vehicle) return null

  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    nickname: vehicle.nickname,
    plate: vehicle.plate,
    vin: vehicle.vin,
    photoUrl: vehicle.photoUrl,
    historyEntries: vehicle.historyEntries.map(e => ({
      id: e.id,
      type: e.type,
      description: e.description,
      performedAt: e.performedAt.toISOString(),
      odometerReading: e.odometerReading,
      cost: e.cost,
      photoUrl: e.photoUrl,
      source: e.source,
      createdById: e.createdById,
      createdByName: e.createdBy.name,
      workshopName: e.workshop?.name ?? null,
    })),
  }
}

export async function getOwnHistoryEntry(userId: string, entryId: string) {
  const entry = await prisma.historyEntry.findUnique({ where: { id: entryId } })
  if (!entry || entry.createdById !== userId) return null
  return entry
}

export function parseOptionalNumber(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : 'invalid'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/vehicleHistory.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/vehicleHistory.ts __tests__/lib/vehicleHistory.test.ts
git commit -m "feat: add vehicle history read helper and shared validation"
```

---

### Task 5: Create history entry — `POST /api/vehicles/[id]/history`

**Files:**
- Create: `app/api/vehicles/[id]/history/route.ts`
- Test: `__tests__/api/vehicle-history.test.ts`

**Interfaces:**
- Consumes: `canAccessVehicleHistory` (Task 3), `parseOptionalNumber` (Task 4)
- Produces: `POST` route handler at `/api/vehicles/[id]/history`, returns 201 with the created `HistoryEntry` row.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/vehicle-history.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/vehicleAccess', () => ({ canAccessVehicleHistory: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { historyEntry: { create: jest.fn() } },
}))

import { POST } from '@/app/api/vehicles/[id]/history/route'
import { getServerSession } from 'next-auth'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

function makeRequest(body: object) {
  return new Request('http://localhost/api/vehicles/v1/history', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'v1' })
const validBody = {
  type: 'MAINTENANCE',
  description: 'Cambio de aceite',
  performedAt: '2026-01-01',
  odometerReading: 50000,
  cost: 100,
  photoUrl: null,
}

describe('POST /api/vehicles/[id]/history', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the user cannot access the vehicle', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(false)
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when type is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, type: 'NOT_A_TYPE' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, description: '' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when performedAt is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, performedAt: 'not-a-date' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when odometerReading is not a number', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, odometerReading: 'abc' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when cost is not a number', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, cost: 'abc' }), { params })
    expect(res.status).toBe(400)
  })

  it('creates an OWNER-sourced entry with no workshopId for an owner', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.historyEntry.create as jest.Mock).mockResolvedValue({ id: 'h1', ...validBody })
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(201)
    expect(prisma.historyEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ vehicleId: 'v1', source: 'OWNER', createdById: 'u1', workshopId: null }),
    })
  })

  it('creates a MECHANIC-sourced entry stamped with the workshopId for a mechanic', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.historyEntry.create as jest.Mock).mockResolvedValue({ id: 'h2', ...validBody })
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(201)
    expect(prisma.historyEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'MECHANIC', createdById: 'm1', workshopId: 'ws1' }),
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/vehicle-history.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/vehicles/[id]/history/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/vehicles/[id]/history/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ServiceItemType } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { parseOptionalNumber } from '@/lib/vehicleHistory'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: vehicleId } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, vehicleId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const { type, description, performedAt, odometerReading, cost, photoUrl } = await request.json()

  if (!type || !Object.values(ServiceItemType).includes(type)) {
    return NextResponse.json({ error: 'A valid type is required' }, { status: 400 })
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  const parsedDate = new Date(performedAt)
  if (!performedAt || Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'A valid performedAt date is required' }, { status: 400 })
  }
  const odometerReadingValue = parseOptionalNumber(odometerReading)
  if (odometerReadingValue === 'invalid') {
    return NextResponse.json({ error: 'odometerReading must be a number' }, { status: 400 })
  }
  const costValue = parseOptionalNumber(cost)
  if (costValue === 'invalid') {
    return NextResponse.json({ error: 'cost must be a number' }, { status: 400 })
  }

  const entry = await prisma.historyEntry.create({
    data: {
      vehicleId,
      type,
      description,
      performedAt: parsedDate,
      odometerReading: odometerReadingValue,
      cost: costValue,
      photoUrl: photoUrl || null,
      source: session.user.role === 'MECHANIC' ? 'MECHANIC' : 'OWNER',
      createdById: session.user.id,
      workshopId: session.user.role === 'MECHANIC' ? session.user.workshopId : null,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/vehicle-history.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/vehicles/[id]/history/route.ts __tests__/api/vehicle-history.test.ts
git commit -m "feat: add POST /api/vehicles/[id]/history"
```

---

### Task 6: Edit and delete history entry — `PATCH`/`DELETE /api/history/[id]`

**Files:**
- Create: `app/api/history/[id]/route.ts`
- Test: `__tests__/api/history-entry.test.ts`

**Interfaces:**
- Consumes: `parseOptionalNumber` (Task 4)
- Produces: `PATCH` and `DELETE` route handlers at `/api/history/[id]`.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/history-entry.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    historyEntry: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}))

import { PATCH, DELETE } from '@/app/api/history/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

function makeRequest(method: string, body?: object) {
  return new Request('http://localhost/api/history/h1', {
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
}

const params = Promise.resolve({ id: 'h1' })
const validBody = {
  type: 'REPAIR',
  description: 'Cambio de pastillas de freno',
  performedAt: '2026-02-01',
  odometerReading: 51000,
  cost: 200,
  photoUrl: null,
}

describe('PATCH /api/history/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the entry does not exist', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the caller is not the author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the body is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    const res = await PATCH(makeRequest('PATCH', { ...validBody, type: 'NOT_A_TYPE' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates the entry and returns 200 for its author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    ;(prisma.historyEntry.update as jest.Mock).mockResolvedValue({ id: 'h1', ...validBody })
    const res = await PATCH(makeRequest('PATCH', validBody), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('h1')
  })
})

describe('DELETE /api/history/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the caller is not the author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'someone-else' })
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('deletes the entry and returns 204 for its author', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(prisma.historyEntry.findUnique as jest.Mock).mockResolvedValue({ id: 'h1', createdById: 'u1' })
    const res = await DELETE(makeRequest('DELETE'), { params })
    expect(res.status).toBe(204)
    expect(prisma.historyEntry.delete).toHaveBeenCalledWith({ where: { id: 'h1' } })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/history-entry.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/history/[id]/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/history/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ServiceItemType } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseOptionalNumber } from '@/lib/vehicleHistory'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.historyEntry.findUnique({ where: { id } })
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
  }

  const { type, description, performedAt, odometerReading, cost, photoUrl } = await request.json()

  if (!type || !Object.values(ServiceItemType).includes(type)) {
    return NextResponse.json({ error: 'A valid type is required' }, { status: 400 })
  }
  if (!description || typeof description !== 'string') {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  const parsedDate = new Date(performedAt)
  if (!performedAt || Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'A valid performedAt date is required' }, { status: 400 })
  }
  const odometerReadingValue = parseOptionalNumber(odometerReading)
  if (odometerReadingValue === 'invalid') {
    return NextResponse.json({ error: 'odometerReading must be a number' }, { status: 400 })
  }
  const costValue = parseOptionalNumber(cost)
  if (costValue === 'invalid') {
    return NextResponse.json({ error: 'cost must be a number' }, { status: 400 })
  }

  const updated = await prisma.historyEntry.update({
    where: { id },
    data: {
      type,
      description,
      performedAt: parsedDate,
      odometerReading: odometerReadingValue,
      cost: costValue,
      photoUrl: photoUrl || null,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.historyEntry.findUnique({ where: { id } })
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
  }

  await prisma.historyEntry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/history-entry.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/history/[id]/route.ts __tests__/api/history-entry.test.ts
git commit -m "feat: add author-only PATCH/DELETE for history entries"
```

---

### Task 7: Photo attachment via Vercel Blob

**Files:**
- Modify: `package.json` (add `@vercel/blob`)
- Modify: `.env.example`
- Modify: `CLAUDE.md` (Environment Setup section)
- Create: `app/api/history/upload/route.ts`
- Test: `__tests__/api/history-upload.test.ts`

**Interfaces:**
- Produces: `POST` route handler at `/api/history/upload` implementing the Vercel Blob client-upload token contract (`handleUpload` from `@vercel/blob/client`).

- [ ] **Step 1: Install the dependency**

Run: `npm install @vercel/blob`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

```ts
// __tests__/api/history-upload.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@vercel/blob/client', () => ({ handleUpload: jest.fn() }))

import { POST } from '@/app/api/history/upload/route'
import { getServerSession } from 'next-auth'
import { handleUpload } from '@vercel/blob/client'

function makeRequest(body: object) {
  return new Request('http://localhost/api/history/upload', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/history/upload', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated, without calling handleUpload', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(401)
    expect(handleUpload).not.toHaveBeenCalled()
  })

  it('delegates to handleUpload and returns its response when authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER' } })
    ;(handleUpload as jest.Mock).mockResolvedValue({ type: 'blob.generate-client-token', clientToken: 'tok' })
    const res = await POST(makeRequest({ type: 'blob.generate-client-token', payload: {} }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.clientToken).toBe('tok')
  })

  it('returns 400 when handleUpload rejects the request', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER' } })
    ;(handleUpload as jest.Mock).mockRejectedValue(new Error('invalid content type'))
    const res = await POST(makeRequest({ type: 'blob.generate-client-token', payload: {} }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/api/history-upload.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/history/upload/route'`

- [ ] **Step 4: Implement the route**

```ts
// app/api/history/upload/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp'],
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/api/history-upload.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Document the required env var**

In `.env.example`, add after `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`:

```
# Vercel Blob (photo attachments on vehicle history entries).
# Provision via the Vercel dashboard/Marketplace, then `vercel env pull .env.local`.
BLOB_READ_WRITE_TOKEN=""
```

In `CLAUDE.md`, add `BLOB_READ_WRITE_TOKEN=""` to the `Environment Setup` code block, with a one-line comment matching the style of the Google Maps key entry.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json app/api/history/upload/route.ts __tests__/api/history-upload.test.ts .env.example CLAUDE.md
git commit -m "feat: add Vercel Blob upload endpoint for history photos"
```

---

### Task 8: Shared timeline component

**Files:**
- Create: `components/shared/VehicleHistoryTimeline.tsx`

**Interfaces:**
- Consumes: `HistoryEntrySummary` (Task 4), `SERVICE_ITEM_TYPE_LABELS` (Task 2)
- Produces: `VehicleHistoryTimeline({ entries, currentUserId, basePath }: { entries: HistoryEntrySummary[]; currentUserId: string; basePath: string })` — a client component. Edit links point to `${basePath}/history/${entry.id}/edit`.

- [ ] **Step 1: Implement the component**

```tsx
// components/shared/VehicleHistoryTimeline.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WrenchIcon, OdometerIcon } from '@/components/ui/icons'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_ITEM_TYPE_LABELS } from '@/lib/serviceItemType'
import type { HistoryEntrySummary } from '@/lib/vehicleHistory'

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

interface VehicleHistoryTimelineProps {
  entries: HistoryEntrySummary[]
  currentUserId: string
  basePath: string
}

export function VehicleHistoryTimeline({ entries, currentUserId, basePath }: VehicleHistoryTimelineProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('No se pudo eliminar el registro.')
        return
      }
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <div className="bezel">
        <div className="bezel-core flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
            <WrenchIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-medium text-foreground">Todavía no hay registros</span>
            <span className="text-sm text-muted-foreground">Agregá el primero para empezar el historial.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
          {error}
        </p>
      )}
      {entries.map(entry => (
        <div key={entry.id} className="bezel">
          <div className="bezel-core flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08]">
                  <WrenchIcon className="size-4.5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{SERVICE_ITEM_TYPE_LABELS[entry.type]}</span>
                  <span className="text-xs text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(entry.performedAt))}
                  </span>
                </div>
              </div>
              <Badge variant={entry.source === 'MECHANIC' ? 'ok' : 'idle'}>
                <BadgeDot />
                {entry.source === 'MECHANIC'
                  ? `Registrado por ${entry.workshopName ?? 'el taller'}`
                  : 'Reportado por el dueño'}
              </Badge>
            </div>

            <p className="text-sm text-foreground/90">{entry.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {entry.odometerReading !== null && (
                <span className="flex items-center gap-1.5">
                  <OdometerIcon className="size-3.5" />
                  {entry.odometerReading.toLocaleString('es-AR')} km
                </span>
              )}
              {entry.cost !== null && <span>${entry.cost.toLocaleString('es-AR')}</span>}
            </div>

            {entry.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.photoUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
            )}

            {entry.createdById === currentUserId && (
              <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${basePath}/history/${entry.id}/edit`}>Editar</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === entry.id}
                  onClick={() => handleDelete(entry.id)}
                >
                  {deletingId === entry.id ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/shared/VehicleHistoryTimeline.tsx
git commit -m "feat: add shared vehicle history timeline component"
```

---

### Task 9: Shared create/edit form

**Files:**
- Create: `components/shared/HistoryEntryForm.tsx`

**Interfaces:**
- Consumes: `SERVICE_ITEM_TYPE_OPTIONS` (Task 2), `upload()` from `@vercel/blob/client` (Task 7's dependency), `POST /api/vehicles/[id]/history` and `PATCH /api/history/[id]` (Tasks 5–6)
- Produces: `HistoryEntryForm({ vehicleId, backHref, mode, entryId, initialValues }: HistoryEntryFormProps)` where
  ```ts
  interface HistoryEntryFormInitialValues {
    type: ServiceItemType
    description: string
    performedAt: string
    odometerReading: number | null
    cost: number | null
    photoUrl: string | null
  }
  interface HistoryEntryFormProps {
    vehicleId: string
    backHref: string
    mode: 'create' | 'edit'
    entryId?: string
    initialValues?: HistoryEntryFormInitialValues
  }
  ```

- [ ] **Step 1: Implement the component**

```tsx
// components/shared/HistoryEntryForm.tsx
'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { UploadIcon, PlusIcon } from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SERVICE_ITEM_TYPE_OPTIONS } from '@/lib/serviceItemType'
import type { ServiceItemType } from '@prisma/client'

interface HistoryEntryFormInitialValues {
  type: ServiceItemType
  description: string
  performedAt: string
  odometerReading: number | null
  cost: number | null
  photoUrl: string | null
}

interface HistoryEntryFormProps {
  vehicleId: string
  backHref: string
  mode: 'create' | 'edit'
  entryId?: string
  initialValues?: HistoryEntryFormInitialValues
}

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

export function HistoryEntryForm({ vehicleId, backHref, mode, entryId, initialValues }: HistoryEntryFormProps) {
  const router = useRouter()
  const [type, setType] = useState<string>(initialValues?.type ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [performedAt, setPerformedAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.performedAt) : null
  )
  const [odometerReading, setOdometerReading] = useState(
    initialValues?.odometerReading != null ? String(initialValues.odometerReading) : ''
  )
  const [cost, setCost] = useState(initialValues?.cost != null ? String(initialValues.cost) : '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialValues?.photoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/history/upload',
      })
      setPhotoUrl(blob.url)
    } catch {
      setUploadError('No se pudo subir la foto. Podés guardar el registro sin ella.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const url = mode === 'create' ? `/api/vehicles/${vehicleId}/history` : `/api/history/${entryId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          performedAt: performedAt?.toISOString(),
          odometerReading: odometerReading || null,
          cost: cost || null,
          photoUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      router.push(backHref)
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: motionTokens.easing.fluid }}
        className="mx-auto w-full max-w-[640px]"
      >
        <div className="mb-10 flex flex-col items-start gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            {mode === 'create' ? 'Nuevo registro' : 'Editar registro'}
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            {mode === 'create' ? 'Sumá al historial.' : 'Actualizá el registro.'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-8 p-7 sm:p-9">
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="type" className={fieldLabel}>Tipo</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_ITEM_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="description" className={fieldLabel}>Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="p. ej. Cambio de aceite y filtro"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <Label className={fieldLabel}>Fecha realizada</Label>
                  <DatePicker
                    selected={performedAt}
                    onSelect={setPerformedAt}
                    maxMonth={new Date()}
                    isDayDisabled={date => date.getTime() > Date.now()}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="odometerReading" className={fieldLabel}>Kilometraje (opcional)</Label>
                  <Input
                    id="odometerReading"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={odometerReading}
                    onChange={e => setOdometerReading(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="cost" className={fieldLabel}>Costo (opcional)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <span className={fieldLabel}>Foto (opcional)</span>
                <label className="group/upload flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[1rem] border border-dashed border-white/[0.14] bg-white/[0.02] transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/50 hover:bg-primary/[0.03]">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <UploadIcon className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {uploading ? 'Subiendo…' : 'Clic para subir'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
                {uploadError && <p className="text-xs text-[#ffb3ae]">{uploadError}</p>}
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-6">
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || !type || !performedAt}>
                  {submitting ? 'Guardando…' : 'Guardar registro'}
                  {!submitting && (
                    <ButtonIconIsland>
                      <PlusIcon className="size-3.5" />
                    </ButtonIconIsland>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </MotionConfig>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/shared/HistoryEntryForm.tsx
git commit -m "feat: add shared history entry create/edit form"
```

---

### Task 10: Owner vehicle detail page

**Files:**
- Create: `app/(dashboard)/owner/vehicles/[id]/page.tsx`
- Modify: `app/(dashboard)/owner/DashboardContent.tsx`

**Interfaces:**
- Consumes: `getVehicleWithHistory` (Task 4), `VehicleHistoryTimeline` (Task 8)
- Produces: page at `/owner/vehicles/[id]`; `VehicleCard` gains an `onOpen: () => void` prop.

- [ ] **Step 1: Create the detail page**

```tsx
// app/(dashboard)/owner/vehicles/[id]/page.tsx
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getVehicleWithHistory } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { VehicleHistoryTimeline } from '@/components/shared/VehicleHistoryTimeline'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { PlusIcon } from '@/components/ui/icons'

export default async function OwnerVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const { id } = await params
  const [vehicle, userImage] = await Promise.all([
    getVehicleWithHistory(session.user, id),
    getUserImage(session.user.id),
  ])
  if (!vehicle) notFound()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Historial de servicio
              </span>
              <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                {vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              </h1>
            </div>
            <Button asChild>
              <Link href={`/owner/vehicles/${vehicle.id}/history/new`}>
                Agregar registro
                <ButtonIconIsland>
                  <PlusIcon className="size-3.5" />
                </ButtonIconIsland>
              </Link>
            </Button>
          </div>
          <VehicleHistoryTimeline
            entries={vehicle.historyEntries}
            currentUserId={session.user.id}
            basePath={`/owner/vehicles/${vehicle.id}`}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Make `VehicleCard` in `DashboardContent.tsx` navigable**

In `app/(dashboard)/owner/DashboardContent.tsx`, change the `VehicleCard` function signature and root element:

```tsx
function VehicleCard({ v, index, onOpen }: { v: VehicleSummary; index: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      {...enter(0.16 + index * 0.07)}
      whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      className="bezel h-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
```

(Keep the rest of the function body — the inner `<div className="bezel-core ...">` and everything inside it — unchanged. Only the outer element changes from `motion.div` to `motion.button` with `type="button"` and `onClick={onOpen}` added, and `className` gains `text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40`.)

Then update the call site inside `DashboardContent`:

```tsx
{vehicles.map((v, i) => (
  <VehicleCard key={v.id} v={v} index={i} onOpen={() => router.push(`/owner/vehicles/${v.id}`)} />
))}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/owner/vehicles/[id]/page.tsx" "app/(dashboard)/owner/DashboardContent.tsx"
git commit -m "feat: add owner vehicle detail page with history timeline"
```

---

### Task 11: Owner add-entry page

**Files:**
- Create: `app/(dashboard)/owner/vehicles/[id]/history/new/page.tsx`

**Interfaces:**
- Consumes: `HistoryEntryForm` (Task 9), `canAccessVehicleHistory` (Task 3)

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/owner/vehicles/[id]/history/new/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'

export default async function OwnerNewHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const { id } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, id)
  if (!hasAccess) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <HistoryEntryForm vehicleId={id} backHref={`/owner/vehicles/${id}`} mode="create" />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/owner/vehicles/[id]/history/new/page.tsx"
git commit -m "feat: add owner add-history-entry page"
```

---

### Task 12: Owner edit-entry page

**Files:**
- Create: `app/(dashboard)/owner/vehicles/[id]/history/[entryId]/edit/page.tsx`

**Interfaces:**
- Consumes: `getOwnHistoryEntry` (Task 4), `HistoryEntryForm` (Task 9)

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/owner/vehicles/[id]/history/[entryId]/edit/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getOwnHistoryEntry } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'

export default async function OwnerEditHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const { id, entryId } = await params
  const entry = await getOwnHistoryEntry(session.user.id, entryId)
  if (!entry) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardNav
        userName={session.user.name ?? 'usuario'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <HistoryEntryForm
            vehicleId={id}
            backHref={`/owner/vehicles/${id}`}
            mode="edit"
            entryId={entry.id}
            initialValues={{
              type: entry.type,
              description: entry.description,
              performedAt: entry.performedAt.toISOString(),
              odometerReading: entry.odometerReading,
              cost: entry.cost,
              photoUrl: entry.photoUrl,
            }}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/owner/vehicles/[id]/history/[entryId]/edit/page.tsx"
git commit -m "feat: add owner edit-history-entry page"
```

---

### Task 13: Mechanic vehicles list

**Files:**
- Create: `app/(dashboard)/mechanic/vehicles/page.tsx`
- Create: `app/(dashboard)/mechanic/vehicles/VehicleSearchList.tsx`
- Modify: `app/(dashboard)/mechanic/nav-items.ts`

**Interfaces:**
- Consumes: `getWorkshopVehicles` (Task 3)
- Produces: page at `/mechanic/vehicles`; `VehicleSearchList({ vehicles }: { vehicles: { id: string; label: string; plate: string | null; vin: string | null; ownerName: string }[] })`.

- [ ] **Step 1: Add the nav item**

In `app/(dashboard)/mechanic/nav-items.ts`:

```ts
import type { DashboardNavItem } from '@/components/shared/DashboardNav'

export const MECHANIC_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/mechanic', label: 'Panel' },
  { key: 'vehicles', href: '/mechanic/vehicles', label: 'Vehículos' },
  { key: 'settings', href: '/mechanic/settings', label: 'Configuración' },
]
```

- [ ] **Step 2: Create the client filter list**

```tsx
// app/(dashboard)/mechanic/vehicles/VehicleSearchList.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SearchIcon, CarIcon, ChevronRightIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'

interface VehicleSearchListItem {
  id: string
  label: string
  plate: string | null
  vin: string | null
  ownerName: string
}

interface VehicleSearchListProps {
  vehicles: VehicleSearchListItem[]
}

export function VehicleSearchList({ vehicles }: VehicleSearchListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter(v =>
      v.label.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      (v.plate?.toLowerCase().includes(q) ?? false) ||
      (v.vin?.toLowerCase().includes(q) ?? false)
    )
  }, [vehicles, query])

  return (
    <div className="flex flex-col gap-5">
      <div className="group relative max-w-sm">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60">
          <SearchIcon className="size-4" />
        </span>
        <Input
          placeholder="Buscar por patente, VIN o dueño"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bezel">
          <div className="bezel-core flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
              <CarIcon className="size-6" />
            </span>
            <span className="text-sm text-muted-foreground">
              {vehicles.length === 0
                ? 'Todavía no hay vehículos vinculados a tu taller.'
                : 'Ningún vehículo coincide con la búsqueda.'}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(v => (
            <Link
              key={v.id}
              href={`/mechanic/vehicles/${v.id}`}
              className="group bezel outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              <div className="bezel-core flex items-center justify-between gap-3 p-5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">{v.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{v.ownerName}</span>
                  {v.plate && (
                    <span className="mt-1 w-fit rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-foreground ring-1 ring-white/[0.1]">
                      {v.plate}
                    </span>
                  )}
                </div>
                <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the page**

```tsx
// app/(dashboard)/mechanic/vehicles/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getWorkshopVehicles } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { VehicleSearchList } from './VehicleSearchList'

export default async function MechanicVehiclesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const [rawVehicles, userImage] = await Promise.all([
    getWorkshopVehicles(session.user.workshopId),
    getUserImage(session.user.id),
  ])

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
    plate: v.plate,
    vin: v.vin,
    ownerName: v.owner.name ?? 'Sin nombre',
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">
              <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
              Vehículos del taller
            </span>
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
              Historial de tus clientes.
            </h1>
          </div>
          <VehicleSearchList vehicles={vehicles} />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/mechanic/vehicles/page.tsx" "app/(dashboard)/mechanic/vehicles/VehicleSearchList.tsx" "app/(dashboard)/mechanic/nav-items.ts"
git commit -m "feat: add mechanic vehicles list page"
```

---

### Task 14: Mechanic vehicle detail page

**Files:**
- Create: `app/(dashboard)/mechanic/vehicles/[id]/page.tsx`

**Interfaces:**
- Consumes: `getVehicleWithHistory` (Task 4), `VehicleHistoryTimeline` (Task 8)

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/mechanic/vehicles/[id]/page.tsx
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getVehicleWithHistory } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { VehicleHistoryTimeline } from '@/components/shared/VehicleHistoryTimeline'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { PlusIcon } from '@/components/ui/icons'
import { MECHANIC_NAV_ITEMS } from '../../nav-items'

export default async function MechanicVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const { id } = await params
  const [vehicle, userImage] = await Promise.all([
    getVehicleWithHistory(session.user, id),
    getUserImage(session.user.id),
  ])
  if (!vehicle) notFound()

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Historial de servicio
              </span>
              <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                {vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              </h1>
            </div>
            <Button asChild>
              <Link href={`/mechanic/vehicles/${vehicle.id}/history/new`}>
                Agregar registro
                <ButtonIconIsland>
                  <PlusIcon className="size-3.5" />
                </ButtonIconIsland>
              </Link>
            </Button>
          </div>
          <VehicleHistoryTimeline
            entries={vehicle.historyEntries}
            currentUserId={session.user.id}
            basePath={`/mechanic/vehicles/${vehicle.id}`}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/mechanic/vehicles/[id]/page.tsx"
git commit -m "feat: add mechanic vehicle detail page with history timeline"
```

---

### Task 15: Mechanic add-entry page

**Files:**
- Create: `app/(dashboard)/mechanic/vehicles/[id]/history/new/page.tsx`

**Interfaces:**
- Consumes: `HistoryEntryForm` (Task 9), `canAccessVehicleHistory` (Task 3)

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/mechanic/vehicles/[id]/history/new/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'
import { MECHANIC_NAV_ITEMS } from '../../../../nav-items'

export default async function MechanicNewHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const { id } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, id)
  if (!hasAccess) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px]">
          <HistoryEntryForm vehicleId={id} backHref={`/mechanic/vehicles/${id}`} mode="create" />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/mechanic/vehicles/[id]/history/new/page.tsx"
git commit -m "feat: add mechanic add-history-entry page"
```

---

### Task 16: Mechanic edit-entry page

**Files:**
- Create: `app/(dashboard)/mechanic/vehicles/[id]/history/[entryId]/edit/page.tsx`

**Interfaces:**
- Consumes: `getOwnHistoryEntry` (Task 4), `HistoryEntryForm` (Task 9)

- [ ] **Step 1: Create the page**

```tsx
// app/(dashboard)/mechanic/vehicles/[id]/history/[entryId]/edit/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserImage } from '@/lib/user'
import { getOwnHistoryEntry } from '@/lib/vehicleHistory'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { HistoryEntryForm } from '@/components/shared/HistoryEntryForm'
import { MECHANIC_NAV_ITEMS } from '../../../../../nav-items'

export default async function MechanicEditHistoryEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const { id, entryId } = await params
  const entry = await getOwnHistoryEntry(session.user.id, entryId)
  if (!entry) notFound()

  const userImage = await getUserImage(session.user.id)

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="vehicles"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto w-full max-w-[1200px]">
          <HistoryEntryForm
            vehicleId={id}
            backHref={`/mechanic/vehicles/${id}`}
            mode="edit"
            entryId={entry.id}
            initialValues={{
              type: entry.type,
              description: entry.description,
              performedAt: entry.performedAt.toISOString(),
              odometerReading: entry.odometerReading,
              cost: entry.cost,
              photoUrl: entry.photoUrl,
            }}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/mechanic/vehicles/[id]/history/[entryId]/edit/page.tsx"
git commit -m "feat: add mechanic edit-history-entry page"
```

---

### Task 17: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all suites pass, including the 5 new files added in Tasks 3, 4, 5, 6, and 7.

- [ ] **Step 3: Run a full build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Manually exercise the golden path** (requires `docker compose up -d db` and `npm run dev`)

- Log in as an owner, open a vehicle, add a history entry with a photo, confirm the "Reportado por el dueño" badge appears, edit it, delete it.
- Log in as a mechanic whose workshop has an appointment or work order against that same vehicle, open `/mechanic/vehicles`, find it, add an entry, confirm "Registrado por {workshop name}" appears on it, and confirm the owner's entry from the previous step has no edit/delete controls for this mechanic.
- Confirm a mechanic at an unrelated workshop cannot find that vehicle in their `/mechanic/vehicles` list.

No code changes in this task — if step 4 surfaces a bug, fix it in the relevant task's files and re-run steps 1–3 before considering the plan complete.
