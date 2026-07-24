# Vehicle Check-In & Kanban Ticket Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate scheduled appointments behind an explicit check-in step, and give the dormant `WorkOrder` model its first UI: a Jira-style board where checking in creates a ticket that mechanics move through status columns.

**Architecture:** A nullable `WorkOrder.appointmentId` links a ticket back to the appointment it was checked in from. A small side-effect lookup table (`ON_STATUS_CHANGE`, keyed by `WorkOrderStatus`) runs inside the status-update transaction — only `COMPLETED` and `CANCELLED` have entries. Two new mutation routes (check-in, ticket PATCH); the board page itself reads Prisma directly (this codebase's established convention for workshop-scoped reads). Five UI components: two card types, a detail dialog, the board shell, and the page.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers), Prisma 7, NextAuth 4 (JWT session already carries `workshopId`/`workshopRole`), Jest for API/lib tests.

## Global Constraints

- Any workshop mechanic (`ADMIN` or `STAFF`) can check in any of the workshop's `SCHEDULED` appointments, and can view/update/reassign any ticket in the workshop — not just the assignee. Matches this codebase's existing workshop-scoped (not per-mechanic) access model.
- Check-in does not add a new `AppointmentStatus` value. The "Programado" column is computed: `status: 'SCHEDULED'` appointments with no linked `WorkOrder`.
- `WorkOrder.mechanicId` stays required — check-in always assigns the checking-in mechanic.
- A ticket reaching `COMPLETED` or `CANCELLED` syncs its linked `Appointment.status` to match (if one is linked).
- A ticket reaching `COMPLETED` auto-creates a `HistoryEntry` (`type: 'OTHER'`, `source: 'MECHANIC'`) unless one already exists for that `workOrderId` — idempotent, never double-logs across a `COMPLETED → IN_PROGRESS → COMPLETED` round-trip.
- Status-change side effects are a lookup table (`ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, StatusEffect>>`), not a State-pattern class hierarchy — only 2 of 4 statuses have any side effect, and this codebase has no class-based domain abstractions elsewhere.
- Status changes go through a `Select`/buttons on the card — no drag-and-drop, no new dependency.
- `ServiceItem` (parts/labor) management is out of scope. Ticket editing is title/description/status/assignee only.
- No pagination or time-windowing on board columns in this pass.
- All user-facing copy is Spanish (Latin American), matching every existing page.
- Every new UI reuses existing primitives (`components/ui/*`, `bezel`/`bezel-core` classes) — no new visual patterns.
- This repo's test suite covers pure logic and API routes only — no component-testing setup, so UI tasks in this plan do not add tests, matching every prior spec's convention in this codebase.

---

### Task 1: Schema — link `WorkOrder` to `Appointment`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `WorkOrder.appointmentId: String?` (unique), `WorkOrder.appointment: Appointment?` relation, `Appointment.workOrder: WorkOrder?` back-relation.

- [ ] **Step 1: Add the field and relation to `model WorkOrder`**

In `model WorkOrder`, add `appointmentId String?` directly after `mechanicId`:

```prisma
  appointmentId String?     @unique
```

In the same model's relations block, add after `mechanic`:

```prisma
  appointment  Appointment?  @relation(fields: [appointmentId], references: [id])
```

- [ ] **Step 2: Add the back-relation to `model Appointment`**

In `model Appointment`, add to the relations block, after `workshop`:

```prisma
  workOrder WorkOrder?
```

- [ ] **Step 3: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: completes with no errors.

- [ ] **Step 5: Create and apply the migration**

Requires the dev database running — if it isn't, run `docker compose up -d db` first (per `CLAUDE.md`).

Run: `npx prisma migrate dev --name link_workorder_to_appointment`
Expected: a new folder under `prisma/migrations/` and `Your database is now in sync with your schema.`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: link WorkOrder to the Appointment it was checked in from"
```

---

### Task 2: Status-change side effects — `lib/workOrderStatusEffects.ts`

**Files:**
- Create: `lib/workOrderStatusEffects.ts`
- Test: `__tests__/lib/workOrderStatusEffects.test.ts`

**Interfaces:**
- Consumes: `WorkOrder.appointmentId` (Task 1)
- Produces: `ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, (tx: Prisma.TransactionClient, workOrder: WorkOrder, workshopId: string) => Promise<void>>>` from `lib/workOrderStatusEffects.ts`. Only `COMPLETED` and `CANCELLED` have entries.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/workOrderStatusEffects.test.ts
import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'
import type { WorkOrder } from '@prisma/client'

function makeTx() {
  return {
    appointment: { update: jest.fn() },
    historyEntry: { findFirst: jest.fn(), create: jest.fn() },
  }
}

const workOrder = {
  id: 'wo1',
  title: 'Cambio de aceite',
  description: 'Ruido en el motor',
  vehicleId: 'v1',
  mechanicId: 'm1',
  appointmentId: 'a1',
} as WorkOrder

describe('ON_STATUS_CHANGE table', () => {
  it('has no entry for PENDING or IN_PROGRESS', () => {
    expect(ON_STATUS_CHANGE.PENDING).toBeUndefined()
    expect(ON_STATUS_CHANGE.IN_PROGRESS).toBeUndefined()
  })
})

describe('ON_STATUS_CHANGE.COMPLETED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to COMPLETED', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'COMPLETED' } })
  })

  it('does not touch the appointment when there is none linked', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, { ...workOrder, appointmentId: null }, 'ws1')
    expect(tx.appointment.update).not.toHaveBeenCalled()
  })

  it('creates a HistoryEntry when none exists yet', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).toHaveBeenCalledWith({
      data: {
        vehicleId: 'v1',
        type: 'OTHER',
        description: 'Cambio de aceite — Ruido en el motor',
        performedAt: expect.any(Date),
        source: 'MECHANIC',
        createdById: 'm1',
        workshopId: 'ws1',
        workOrderId: 'wo1',
      },
    })
  })

  it('uses only the title when there is no description', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, { ...workOrder, description: null }, 'ws1')
    expect(tx.historyEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ description: 'Cambio de aceite' }) })
    )
  })

  it('does not create a duplicate HistoryEntry when one already exists', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue({ id: 'h1' })
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })
})

describe('ON_STATUS_CHANGE.CANCELLED', () => {
  beforeEach(() => jest.clearAllMocks())

  it('syncs the linked appointment to CANCELLED', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(tx as any, workOrder, 'ws1')
    expect(tx.appointment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'CANCELLED' } })
  })

  it('does not touch history', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(tx as any, workOrder, 'ws1')
    expect(tx.historyEntry.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/workOrderStatusEffects.test.ts`
Expected: FAIL — `Cannot find module '@/lib/workOrderStatusEffects'`

- [ ] **Step 3: Implement `lib/workOrderStatusEffects.ts`**

```ts
import { Prisma, WorkOrder, WorkOrderStatus } from '@prisma/client'

type StatusEffect = (
  tx: Prisma.TransactionClient,
  workOrder: WorkOrder,
  workshopId: string
) => Promise<void>

export const ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, StatusEffect>> = {
  COMPLETED: async (tx, workOrder, workshopId) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({
        where: { id: workOrder.appointmentId },
        data: { status: 'COMPLETED' },
      })
    }

    const existing = await tx.historyEntry.findFirst({ where: { workOrderId: workOrder.id } })
    if (!existing) {
      await tx.historyEntry.create({
        data: {
          vehicleId: workOrder.vehicleId,
          type: 'OTHER',
          description: workOrder.description
            ? `${workOrder.title} — ${workOrder.description}`
            : workOrder.title,
          performedAt: new Date(),
          source: 'MECHANIC',
          createdById: workOrder.mechanicId,
          workshopId,
          workOrderId: workOrder.id,
        },
      })
    }
  },
  CANCELLED: async (tx, workOrder) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({
        where: { id: workOrder.appointmentId },
        data: { status: 'CANCELLED' },
      })
    }
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/workOrderStatusEffects.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/workOrderStatusEffects.ts __tests__/lib/workOrderStatusEffects.test.ts
git commit -m "feat: add WorkOrder status-change side-effect table"
```

---

### Task 3: Check-in — `POST /api/appointments/[id]/check-in`

**Files:**
- Create: `app/api/appointments/[id]/check-in/route.ts`
- Test: `__tests__/api/appointments-checkin.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (uses `WorkOrder.appointmentId` from Task 1 directly via Prisma)
- Produces: `POST /api/appointments/[id]/check-in` → `201` with the created `WorkOrder`.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/appointments-checkin.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
    workOrder: { create: jest.fn() },
  },
}))

import { POST } from '@/app/api/appointments/[id]/check-in/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.appointment.findUnique as jest.Mock
const mockCreate = prisma.workOrder.create as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/appointments/a1/check-in', { method: 'POST' })
}
const params = Promise.resolve({ id: 'a1' })

const mechanicSession = { user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } }

describe('POST /api/appointments/[id]/check-in', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 for an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic with no workshop', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the appointment does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the appointment belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws-other', status: 'SCHEDULED', workOrder: null })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 when the appointment is not SCHEDULED', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws1', status: 'CANCELLED', workOrder: null })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when the appointment already has a work order', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: { id: 'wo-existing' } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when a concurrent check-in already claimed the appointment', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({
      id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: null,
      title: 'Cambio de aceite', notes: null, vehicleId: 'v1',
    })
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.8.0' })
    )
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('creates a WorkOrder from the appointment and returns 201', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({
      id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: null,
      title: 'Cambio de aceite', notes: 'Ruido en el motor', vehicleId: 'v1',
    })
    mockCreate.mockResolvedValue({ id: 'wo1', title: 'Cambio de aceite' })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        title: 'Cambio de aceite',
        description: 'Ruido en el motor',
        status: 'PENDING',
        vehicleId: 'v1',
        mechanicId: 'm1',
        appointmentId: 'a1',
      },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/appointments-checkin.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/appointments/[id]/check-in/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/appointments/[id]/check-in/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { workOrder: { select: { id: true } } },
  })
  if (!appointment || appointment.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }
  if (appointment.status !== 'SCHEDULED' || appointment.workOrder) {
    return NextResponse.json({ error: 'El turno ya fue registrado o no está programado' }, { status: 409 })
  }

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        title: appointment.title,
        description: appointment.notes,
        status: 'PENDING',
        vehicleId: appointment.vehicleId,
        mechanicId: session.user.id,
        appointmentId: appointment.id,
      },
    })
    return NextResponse.json(workOrder, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'El turno ya fue registrado' }, { status: 409 })
    }
    throw err
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/appointments-checkin.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/appointments/[id]/check-in/route.ts __tests__/api/appointments-checkin.test.ts
git commit -m "feat: add POST /api/appointments/[id]/check-in"
```

---

### Task 4: Ticket update — `PATCH /api/workorders/[id]`

**Files:**
- Create: `app/api/workorders/[id]/route.ts`
- Test: `__tests__/api/workorders.test.ts`

**Interfaces:**
- Consumes: `ON_STATUS_CHANGE` (Task 2)
- Produces: `PATCH /api/workorders/[id]` (body `{ status?, mechanicId?, title?, description? }`) → `200` with the updated `WorkOrder`.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/workorders.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workOrderStatusEffects', () => ({ ON_STATUS_CHANGE: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workOrder: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { PATCH } from '@/app/api/workorders/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'

const mockGetServerSession = getServerSession as jest.Mock
const mockWorkOrderFindUnique = prisma.workOrder.findUnique as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockUpdate = prisma.workOrder.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/workorders/wo1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
const params = Promise.resolve({ id: 'wo1' })

const mechanicSession = { user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } }
const existingWorkOrder = { id: 'wo1', title: 'Cambio de aceite', mechanic: { workshopId: 'ws1' } }

describe('PATCH /api/workorders/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 for an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the work order does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(null)
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the work order belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue({ id: 'wo1', mechanic: { workshopId: 'ws-other' } })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 for an invalid status value', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const res = await PATCH(makeRequest({ status: 'NOT_A_STATUS' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when reassigning to a mechanic outside the workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUserFindUnique.mockResolvedValue({ workshopId: 'ws-other' })
    const res = await PATCH(makeRequest({ mechanicId: 'm2' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates status without a side effect for PENDING/IN_PROGRESS', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, status: 'IN_PROGRESS' })
    const res = await PATCH(makeRequest({ status: 'IN_PROGRESS' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'wo1' }, data: { status: 'IN_PROGRESS' } })
  })

  it('calls the matching status effect when one is registered', async () => {
    const mockEffect = jest.fn().mockResolvedValue(undefined)
    ;(ON_STATUS_CHANGE as Record<string, jest.Mock>).COMPLETED = mockEffect
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const updatedRow = { ...existingWorkOrder, status: 'COMPLETED' }
    mockUpdate.mockResolvedValue(updatedRow)
    const res = await PATCH(makeRequest({ status: 'COMPLETED' }), { params })
    expect(res.status).toBe(200)
    expect(mockEffect).toHaveBeenCalledWith(prisma, updatedRow, 'ws1')
    delete (ON_STATUS_CHANGE as Record<string, jest.Mock>).COMPLETED
  })

  it('updates title, description, and mechanicId together', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUserFindUnique.mockResolvedValue({ workshopId: 'ws1' })
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, title: 'Nuevo título', mechanicId: 'm2' })
    const res = await PATCH(makeRequest({ title: 'Nuevo título', mechanicId: 'm2' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { title: 'Nuevo título', mechanicId: 'm2' },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/workorders.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/workorders/[id]/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/workorders/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { WorkOrderStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: { mechanic: { select: { workshopId: true } } },
  })
  if (!workOrder || workOrder.mechanic.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
  }

  const { status, mechanicId, title, description } = await request.json()

  if (status !== undefined && !Object.values(WorkOrderStatus).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (mechanicId !== undefined) {
    const target = await prisma.user.findUnique({ where: { id: mechanicId }, select: { workshopId: true } })
    if (!target || target.workshopId !== session.user.workshopId) {
      return NextResponse.json({ error: 'El mecánico debe pertenecer a tu taller' }, { status: 400 })
    }
  }

  const updated = await prisma.$transaction(async tx => {
    const result = await tx.workOrder.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(mechanicId !== undefined ? { mechanicId } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    })
    if (status !== undefined) {
      const effect = ON_STATUS_CHANGE[status as WorkOrderStatus]
      if (effect) await effect(tx, result, session.user.workshopId!)
    }
    return result
  })

  return NextResponse.json(updated)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/workorders.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/workorders/[id]/route.ts __tests__/api/workorders.test.ts
git commit -m "feat: add PATCH /api/workorders/[id]"
```

---

### Task 5: Status labels — `lib/workOrderStatus.ts`

**Files:**
- Create: `lib/workOrderStatus.ts`

**Interfaces:**
- Produces: `WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string>`, `WORK_ORDER_STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[]`

- [ ] **Step 1: Create the labels file**

Mirrors the existing `lib/serviceItemType.ts` pattern exactly.

```ts
import { WorkOrderStatus } from '@prisma/client'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

export const WORK_ORDER_STATUS_OPTIONS = Object.values(WorkOrderStatus).map(value => ({
  value,
  label: WORK_ORDER_STATUS_LABELS[value],
}))
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/workOrderStatus.ts
git commit -m "feat: add WorkOrderStatus label map"
```

---

### Task 6: Appointment card — `AppointmentCard.tsx`

**Files:**
- Create: `app/(dashboard)/mechanic/board/AppointmentCard.tsx`

**Interfaces:**
- Consumes: `POST /api/appointments/[id]/check-in` (Task 3)
- Produces:
  ```ts
  export interface AppointmentCardData {
    id: string
    title: string
    scheduledAt: string // ISO
    vehicleLabel: string
    ownerName: string
  }
  ```
  `AppointmentCard({ appointment }: { appointment: AppointmentCardData })` — a client component.

- [ ] **Step 1: Implement the component**

```tsx
// app/(dashboard)/mechanic/board/AppointmentCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ClockIcon } from '@/components/ui/icons'

export interface AppointmentCardData {
  id: string
  title: string
  scheduledAt: string
  vehicleLabel: string
  ownerName: string
}

const TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

export function AppointmentCard({ appointment }: { appointment: AppointmentCardData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckIn() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/check-in`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo registrar la llegada')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bezel">
      <div className="bezel-core flex flex-col gap-3 p-4">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          {TIME_FORMATTER.format(new Date(appointment.scheduledAt))}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{appointment.vehicleLabel}</span>
          <span className="text-xs text-muted-foreground">{appointment.ownerName}</span>
        </div>
        <Button size="sm" disabled={loading} onClick={handleCheckIn} className="w-full">
          {loading ? 'Registrando…' : 'Registrar llegada'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/mechanic/board/AppointmentCard.tsx
git commit -m "feat: add appointment check-in card"
```

---

### Task 7: Ticket card — `TicketCard.tsx`

**Files:**
- Create: `app/(dashboard)/mechanic/board/TicketCard.tsx`

**Interfaces:**
- Consumes: `WORK_ORDER_STATUS_OPTIONS` (Task 5), `PATCH /api/workorders/[id]` (Task 4)
- Produces:
  ```ts
  export interface TicketCardData {
    id: string
    title: string
    description: string | null
    status: WorkOrderStatus
    vehicleId: string
    vehicleLabel: string
    mechanicId: string
    mechanicName: string
  }
  ```
  `TicketCard({ ticket, onOpen }: { ticket: TicketCardData; onOpen: (ticket: TicketCardData) => void })` — a client component. `onOpen` fires when the card body (not the status select) is clicked.

- [ ] **Step 1: Implement the component**

```tsx
// app/(dashboard)/mechanic/board/TicketCard.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { WORK_ORDER_STATUS_OPTIONS } from '@/lib/workOrderStatus'
import type { WorkOrderStatus } from '@prisma/client'

export interface TicketCardData {
  id: string
  title: string
  description: string | null
  status: WorkOrderStatus
  vehicleId: string
  vehicleLabel: string
  mechanicId: string
  mechanicName: string
}

interface TicketCardProps {
  ticket: TicketCardData
  onOpen: (ticket: TicketCardData) => void
}

export function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStatusChange(status: string) {
    setError(null)
    setUpdating(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo actualizar el estado')
        return
      }
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="bezel">
      <div className="bezel-core flex flex-col gap-3 p-4">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <button type="button" onClick={() => onOpen(ticket)} className="flex flex-col gap-1 text-left outline-none">
          <span className="text-sm font-medium text-foreground">{ticket.vehicleLabel}</span>
          <span className="text-xs text-muted-foreground">{ticket.title}</span>
        </button>
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="bg-white/[0.06]">
            <AvatarFallback className="bg-white/[0.06] font-mono text-[0.625rem] font-semibold text-primary">
              {getInitials(ticket.mechanicName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{ticket.mechanicName}</span>
        </div>
        <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updating}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_ORDER_STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/mechanic/board/TicketCard.tsx
git commit -m "feat: add ticket card with status selector"
```

---

### Task 8: Ticket detail dialog — `TicketDialog.tsx`

**Files:**
- Create: `app/(dashboard)/mechanic/board/TicketDialog.tsx`

**Interfaces:**
- Consumes: `TicketCardData` (Task 7), `PATCH /api/workorders/[id]` (Task 4)
- Produces:
  ```ts
  interface Mechanic { id: string; name: string | null; email: string }
  interface TicketDialogProps {
    ticket: TicketCardData | null
    mechanics: Mechanic[]
    onOpenChange: (open: boolean) => void
  }
  ```
  `TicketDialog(props: TicketDialogProps)` — a client component. Renders nothing (closed) when `ticket` is `null`.

- [ ] **Step 1: Implement the component**

```tsx
// app/(dashboard)/mechanic/board/TicketDialog.tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TicketCardData } from './TicketCard'

interface Mechanic {
  id: string
  name: string | null
  email: string
}

interface TicketDialogProps {
  ticket: TicketCardData | null
  mechanics: Mechanic[]
  onOpenChange: (open: boolean) => void
}

function TicketDialogForm({
  ticket,
  mechanics,
  onOpenChange,
}: {
  ticket: TicketCardData
  mechanics: Mechanic[]
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description ?? '')
  const [mechanicId, setMechanicId] = useState(ticket.mechanicId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, mechanicId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo guardar')
        return
      }
      onOpenChange(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{ticket.vehicleLabel}</DialogTitle>
        <DialogDescription>
          <Link href={`/mechanic/vehicles/${ticket.vehicleId}`} className="underline underline-offset-2">
            Ver vehículo
          </Link>
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-title">Título</Label>
          <Input id="ticket-title" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-description">Descripción</Label>
          <Textarea id="ticket-description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-mechanic">Mecánico asignado</Label>
          <Select value={mechanicId} onValueChange={setMechanicId}>
            <SelectTrigger id="ticket-mechanic" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mechanics.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function TicketDialog({ ticket, mechanics, onOpenChange }: TicketDialogProps) {
  return (
    <Dialog open={ticket !== null} onOpenChange={open => { if (!open) onOpenChange(false) }}>
      {ticket && (
        <TicketDialogForm key={ticket.id} ticket={ticket} mechanics={mechanics} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  )
}
```

Note the `key={ticket.id}` on `TicketDialogForm`: it forces React to remount (and re-initialize `useState`) whenever a *different* ticket is opened while the dialog stays mounted — without it, opening ticket B right after ticket A would keep showing A's stale form state.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/mechanic/board/TicketDialog.tsx
git commit -m "feat: add ticket detail dialog"
```

---

### Task 9: Board assembly and page

**Files:**
- Create: `app/(dashboard)/mechanic/board/Board.tsx`
- Create: `app/(dashboard)/mechanic/board/page.tsx`
- Modify: `app/(dashboard)/mechanic/nav-items.ts`

**Interfaces:**
- Consumes: `AppointmentCard`/`AppointmentCardData` (Task 6), `TicketCard`/`TicketCardData` (Task 7), `TicketDialog` (Task 8), `WORK_ORDER_STATUS_OPTIONS` (Task 5)
- Produces: `/mechanic/board` page; `Board({ scheduledAppointments, tickets, mechanics }: BoardProps)`.

- [ ] **Step 1: Add the "Tablero" nav item**

Replace the full contents of `app/(dashboard)/mechanic/nav-items.ts`:

```ts
import type { DashboardNavItem } from '@/components/shared/DashboardNav'

export const MECHANIC_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/mechanic', label: 'Panel' },
  { key: 'board', href: '/mechanic/board', label: 'Tablero' },
  { key: 'vehicles', href: '/mechanic/vehicles', label: 'Vehículos' },
  { key: 'team', href: '/mechanic/team', label: 'Equipo' },
  { key: 'settings', href: '/mechanic/settings', label: 'Configuración' },
]
```

- [ ] **Step 2: Implement `Board.tsx`**

```tsx
// app/(dashboard)/mechanic/board/Board.tsx
'use client'

import { useState } from 'react'
import { AppointmentCard, type AppointmentCardData } from './AppointmentCard'
import { TicketCard, type TicketCardData } from './TicketCard'
import { TicketDialog } from './TicketDialog'
import { WORK_ORDER_STATUS_OPTIONS } from '@/lib/workOrderStatus'
import type { WorkOrderStatus } from '@prisma/client'

interface Mechanic {
  id: string
  name: string | null
  email: string
}

interface BoardProps {
  scheduledAppointments: AppointmentCardData[]
  tickets: TicketCardData[]
  mechanics: Mechanic[]
}

const columnLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'

export function Board({ scheduledAppointments, tickets, mechanics }: BoardProps) {
  const [openTicket, setOpenTicket] = useState<TicketCardData | null>(null)

  function ticketsByStatus(status: WorkOrderStatus) {
    return tickets.filter(t => t.status === status)
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4">
        <h2 className={columnLabel}>Programado</h2>
        <div className="flex flex-col gap-3">
          {scheduledAppointments.map(a => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
          {scheduledAppointments.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin turnos pendientes de llegada.</p>
          )}
        </div>
      </div>
      {WORK_ORDER_STATUS_OPTIONS.map(({ value, label }) => (
        <div key={value} className="flex flex-col gap-4">
          <h2 className={columnLabel}>{label}</h2>
          <div className="flex flex-col gap-3">
            {ticketsByStatus(value).map(t => (
              <TicketCard key={t.id} ticket={t} onOpen={setOpenTicket} />
            ))}
            {ticketsByStatus(value).length === 0 && (
              <p className="text-xs text-muted-foreground">Sin tickets.</p>
            )}
          </div>
        </div>
      ))}
      <TicketDialog
        ticket={openTicket}
        mechanics={mechanics}
        onOpenChange={open => { if (!open) setOpenTicket(null) }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Implement `page.tsx`**

```tsx
// app/(dashboard)/mechanic/board/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { Board } from './Board'

function vehicleLabel(vehicle: {
  nickname: string | null
  year: number
  make: string
  model: string
}) {
  return vehicle.nickname ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
}

export default async function MechanicBoardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const workshopId = session.user.workshopId

  const [appointments, workOrders, mechanics, userImage] = await Promise.all([
    prisma.appointment.findMany({
      where: { workshopId, status: 'SCHEDULED', workOrder: null },
      include: { vehicle: { include: { owner: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: { mechanic: { workshopId } },
      include: {
        vehicle: { select: { nickname: true, year: true, make: true, model: true } },
        mechanic: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { workshopId },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    }),
    getUserImage(session.user.id),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="board"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">
              <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
              Tablero
            </span>
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
              Turnos y órdenes de trabajo.
            </h1>
          </div>
          <Board
            scheduledAppointments={appointments.map(a => ({
              id: a.id,
              title: a.title,
              scheduledAt: a.scheduledAt.toISOString(),
              vehicleLabel: vehicleLabel(a.vehicle),
              ownerName: a.vehicle.owner.name ?? 'Sin nombre',
            }))}
            tickets={workOrders.map(w => ({
              id: w.id,
              title: w.title,
              description: w.description,
              status: w.status,
              vehicleId: w.vehicleId,
              vehicleLabel: vehicleLabel(w.vehicle),
              mechanicId: w.mechanicId,
              mechanicName: w.mechanic.name ?? w.mechanic.email,
            }))}
            mechanics={mechanics}
          />
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
git add app/(dashboard)/mechanic/nav-items.ts app/(dashboard)/mechanic/board/Board.tsx app/(dashboard)/mechanic/board/page.tsx
git commit -m "feat: add mechanic Kanban board page"
```

---

### Task 10: Wire up the Panel's "Órdenes de trabajo" card

**Files:**
- Modify: `app/(dashboard)/mechanic/MechanicPanel.tsx`
- Modify: `app/(dashboard)/mechanic/page.tsx`

**Interfaces:**
- Consumes: `/mechanic/board` (Task 9)
- Produces: `MechanicPanel` gains a `pendingTicketCount: number` prop.

- [ ] **Step 1: Add the `pendingTicketCount` prop and replace the placeholder card**

In `app/(dashboard)/mechanic/MechanicPanel.tsx`, add `pendingTicketCount: number` to `MechanicPanelProps` and to the destructured props in `export function MechanicPanel({ ... })`.

Replace the entire "Work orders — coming soon" block (the `<div className="flex flex-col gap-5 lg:col-span-5">...</div>` under the `{/* Work orders — coming soon */}` comment) with:

```tsx
{/* Work orders */}
<div className="flex flex-col gap-5 lg:col-span-5">
  <motion.h2 {...enter(0.14)} className={cn(sectionLabel, 'px-1')}>
    Órdenes de trabajo
  </motion.h2>
  <motion.div {...enter(0.2)} className="bezel flex-1">
    <div className="bezel-core flex h-full flex-col items-center justify-center gap-5 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
        <WrenchIcon className="size-6" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <Badge variant={pendingTicketCount > 0 ? 'active' : 'idle'}>
          {pendingTicketCount > 0
            ? `${pendingTicketCount} ${pendingTicketCount === 1 ? 'ticket abierto' : 'tickets abiertos'}`
            : 'Sin tickets abiertos'}
        </Badge>
        <span className="max-w-2xs text-sm leading-relaxed text-muted-foreground">
          Gestioná los turnos que llegan y las órdenes de trabajo en curso.
        </span>
      </div>
      <Button asChild variant="secondary">
        <Link href="/mechanic/board">
          Ir al tablero
          <ButtonIconIsland>
            <ArrowUpRightIcon className="size-3.5" />
          </ButtonIconIsland>
        </Link>
      </Button>
    </div>
  </motion.div>
</div>
```

- [ ] **Step 2: Query the pending/in-progress ticket count and pass it down**

In `app/(dashboard)/mechanic/page.tsx`, change the data-fetching `Promise.all` from:

```ts
  const [workshop, userImage] = await Promise.all([
    prisma.workshop.findUnique({
      where: { id: session.user.workshopId },
      include: { hours: true },
    }),
    getUserImage(session.user.id),
  ])
```

to:

```ts
  const [workshop, userImage, pendingTicketCount] = await Promise.all([
    prisma.workshop.findUnique({
      where: { id: session.user.workshopId },
      include: { hours: true },
    }),
    getUserImage(session.user.id),
    prisma.workOrder.count({
      where: { mechanic: { workshopId: session.user.workshopId }, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    }),
  ])
```

And add `pendingTicketCount={pendingTicketCount}` to the `<MechanicPanel ... />` call.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/mechanic/MechanicPanel.tsx app/(dashboard)/mechanic/page.tsx
git commit -m "feat: link the panel's work orders card to the board"
```

---

### Final check

- [ ] **Run the full test suite**

Run: `npm test`
Expected: all suites pass, including every new file added in Tasks 1–10.

- [ ] **Run the linter**

Run: `npm run lint`
Expected: no errors.

- [ ] **Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors.
