# Owner Dashboard — Vehicle Status Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the owner dashboard's "active repairs" timeline so every stage it shows is backed by real `WorkOrder` data (not faked), add a mechanic-set progress sub-stage, and add a 24h grace period after a work order finishes or is cancelled.

**Architecture:** Two new `WorkOrder` fields (`progressStage`, `closedAt`) drive a 5-stage stepper on the owner dashboard hub. Mechanics set `progressStage` from a second selector on their board's `TicketCard`, reusing the existing `PATCH /api/workorders/[id]` route and `ON_STATUS_CHANGE` side-effect table. The owner dashboard's visibility query widens from "IN_PROGRESS only, capped at 3" to "PENDING/IN_PROGRESS always, COMPLETED/CANCELLED within 24h of `closedAt`", extracted into a small testable helper.

**Tech Stack:** Next.js 16 App Router, Prisma v7, `motion/react` (already used throughout — the codebase's `motion` package, not `framer-motion`), Jest (`testEnvironment: 'node'` — no component rendering tests, only pure-logic/API-route tests).

## Global Constraints

- UI copy is Spanish (Latin American), matching every existing label in this codebase.
- Reuse existing design system pieces — `bezel`/`bezel-core` classes, `Badge`/`BadgeDot` variants (`active`, `ok`, `danger`, `idle`), `lib/motionTokens.ts` easing/duration values. Do not invent new colors or tokens.
- Animate only `transform`/`opacity` properties (per the motion-ui skill) — never `width`/`height`/`top`/`left` as the *only* changing property without a transform equivalent already in place (the existing progress-bar fill animates `width`, which is pre-existing and out of scope to change).
- Always set `AnimatePresence`'s `mode` explicitly.
- Reduced-motion is already handled globally: `DashboardContent.tsx`'s outer `<MotionConfig reducedMotion="user">` strips transform-based animation (including the pulse) for users with the OS reduced-motion preference set. **Do not add a second, redundant `useReducedMotion()` check** — it would be dead weight on top of what `MotionConfig` already does.
- Prisma v7: schema changes go in `prisma/schema.prisma`; run `npx prisma migrate dev --name <name>` (requires the local Postgres container — `docker compose up -d db` — to be running) then `npx prisma generate`.
- Follow existing file conventions: `DashboardContent.tsx` uses inline literal-union types for Prisma enums (not imported `@prisma/client` types); `TicketCard.tsx` imports the real `@prisma/client` enum types directly. Match whichever convention the file you're editing already uses.

---

### Task 1: Schema — add `WorkOrderProgressStage` enum and `progressStage`/`closedAt` fields

**Files:**
- Modify: `prisma/schema.prisma` (enum block near line 14, `WorkOrder` model at line 178-196)

**Interfaces:**
- Produces: `WorkOrderProgressStage` enum (`INSPECTING | REPAIRING | WAITING_PARTS`) and two new `WorkOrder` columns — `progressStage WorkOrderProgressStage?` and `closedAt DateTime?` — used by every later task.

- [ ] **Step 1: Add the enum**

In `prisma/schema.prisma`, right after the existing `WorkOrderStatus` enum (ends at line 19):

```prisma
enum WorkOrderProgressStage {
  INSPECTING
  REPAIRING
  WAITING_PARTS
}
```

- [ ] **Step 2: Add the two fields to `WorkOrder`**

In the `WorkOrder` model, add after `status`:

```prisma
model WorkOrder {
  id            String                  @id @default(cuid())
  title         String
  description   String?                 @db.Text
  status        WorkOrderStatus         @default(PENDING)
  progressStage WorkOrderProgressStage?
  startDate     DateTime?
  endDate       DateTime?
  closedAt      DateTime?
  vehicleId     String
  mechanicId    String
  appointmentId String?     @unique
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  vehicle      Vehicle       @relation(fields: [vehicleId], references: [id])
  mechanic     User          @relation("MechanicWorkOrders", fields: [mechanicId], references: [id])
  appointment  Appointment?  @relation(fields: [appointmentId], references: [id])
  serviceItems ServiceItem[]
  historyEntries HistoryEntry[]
}
```

- [ ] **Step 3: Create and apply the migration**

Run: `npx prisma migrate dev --name add_work_order_progress_stage`
Expected: migration created and applied without error; `npx prisma generate` runs automatically as part of `migrate dev`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add WorkOrder progressStage and closedAt fields"
```

---

### Task 2: `lib/workOrderStatusEffects.ts` — default progress stage and stamp `closedAt`

**Files:**
- Modify: `lib/workOrderStatusEffects.ts`
- Test: `__tests__/lib/workOrderStatusEffects.test.ts`

**Interfaces:**
- Consumes: `WorkOrderProgressStage` enum from Task 1 (via `@prisma/client`).
- Produces: `ON_STATUS_CHANGE.IN_PROGRESS` handler (defaults `progressStage` to `INSPECTING` if unset); `ON_STATUS_CHANGE.COMPLETED`/`ON_STATUS_CHANGE.CANCELLED` now also stamp `closedAt`. Consumed by Task 3's route (already the case) and read by Task 5/6's dashboard query.

- [ ] **Step 1: Update `makeTx()` and write the failing tests**

In `__tests__/lib/workOrderStatusEffects.test.ts`, update the helper and the "no entry" test, then add new test blocks:

```ts
function makeTx() {
  return {
    workOrder: { update: jest.fn() },
    appointment: { update: jest.fn() },
    historyEntry: { findFirst: jest.fn(), create: jest.fn() },
  }
}
```

Replace the existing `'ON_STATUS_CHANGE table'` block (it currently asserts `IN_PROGRESS` is undefined, which will no longer be true):

```ts
describe('ON_STATUS_CHANGE table', () => {
  it('has no entry for PENDING', () => {
    expect(ON_STATUS_CHANGE.PENDING).toBeUndefined()
  })
})

describe('ON_STATUS_CHANGE.IN_PROGRESS', () => {
  beforeEach(() => jest.clearAllMocks())

  it('defaults progressStage to INSPECTING when unset', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.IN_PROGRESS!(tx as any, { ...workOrder, progressStage: null }, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { progressStage: 'INSPECTING' },
    })
  })

  it('does not override an already-set progressStage', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.IN_PROGRESS!(tx as any, { ...workOrder, progressStage: 'REPAIRING' }, 'ws1')
    expect(tx.workOrder.update).not.toHaveBeenCalled()
  })
})
```

Add one assertion to the existing `'ON_STATUS_CHANGE.COMPLETED'` describe block:

```ts
  it('stamps closedAt on the work order', async () => {
    const tx = makeTx()
    tx.historyEntry.findFirst.mockResolvedValue(null)
    await ON_STATUS_CHANGE.COMPLETED!(tx as any, workOrder, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { closedAt: expect.any(Date) },
    })
  })
```

Add one assertion to the existing `'ON_STATUS_CHANGE.CANCELLED'` describe block:

```ts
  it('stamps closedAt on the work order', async () => {
    const tx = makeTx()
    await ON_STATUS_CHANGE.CANCELLED!(tx as any, workOrder, 'ws1')
    expect(tx.workOrder.update).toHaveBeenCalledWith({
      where: { id: 'wo1' },
      data: { closedAt: expect.any(Date) },
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- workOrderStatusEffects`
Expected: FAIL — `ON_STATUS_CHANGE.IN_PROGRESS` is undefined; `tx.workOrder.update` not called for COMPLETED/CANCELLED.

- [ ] **Step 3: Implement**

Replace the full contents of `lib/workOrderStatusEffects.ts`:

```ts
import { Prisma, WorkOrder, WorkOrderStatus } from '@prisma/client'

type StatusEffect = (
  tx: Prisma.TransactionClient,
  workOrder: WorkOrder,
  workshopId: string
) => Promise<void>

export const ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, StatusEffect>> = {
  IN_PROGRESS: async (tx, workOrder) => {
    if (!workOrder.progressStage) {
      await tx.workOrder.update({ where: { id: workOrder.id }, data: { progressStage: 'INSPECTING' } })
    }
  },
  COMPLETED: async (tx, workOrder, workshopId) => {
    await tx.workOrder.update({ where: { id: workOrder.id }, data: { closedAt: new Date() } })

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
    await tx.workOrder.update({ where: { id: workOrder.id }, data: { closedAt: new Date() } })

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

Run: `npm test -- workOrderStatusEffects`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/workOrderStatusEffects.ts __tests__/lib/workOrderStatusEffects.test.ts
git commit -m "feat: default progressStage and stamp closedAt on work order status changes"
```

---

### Task 3: `PATCH /api/workorders/[id]` — accept and validate `progressStage`

**Files:**
- Modify: `app/api/workorders/[id]/route.ts`
- Test: `__tests__/api/workorders.test.ts`

**Interfaces:**
- Consumes: `WorkOrderProgressStage` from `@prisma/client` (Task 1); `ON_STATUS_CHANGE` (Task 2, already wired).
- Produces: the route now accepts an optional `progressStage` field in the PATCH body, validated against the enum and written to the row — used by Task 8's mechanic board selector.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/api/workorders.test.ts`, inside the `describe('PATCH /api/workorders/[id]', ...)` block:

```ts
  it('returns 400 for an invalid progressStage value', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    const res = await PATCH(makeRequest({ progressStage: 'NOT_A_STAGE' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates progressStage', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockWorkOrderFindUnique.mockResolvedValue(existingWorkOrder)
    mockUpdate.mockResolvedValue({ ...existingWorkOrder, progressStage: 'REPAIRING' })
    const res = await PATCH(makeRequest({ progressStage: 'REPAIRING' }), { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'wo1' }, data: { progressStage: 'REPAIRING' } })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- workorders.test.ts`
Expected: FAIL — 400 test gets 200 (no validation yet); update test's payload doesn't include `progressStage` yet.

- [ ] **Step 3: Implement**

In `app/api/workorders/[id]/route.ts`, update the import and body handling:

```ts
import { WorkOrderStatus, WorkOrderProgressStage } from '@prisma/client'
```

```ts
  const { status, progressStage, mechanicId, title, description } = await request.json()

  if (status !== undefined && !Object.values(WorkOrderStatus).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (progressStage !== undefined && !Object.values(WorkOrderProgressStage).includes(progressStage)) {
    return NextResponse.json({ error: 'Invalid progress stage' }, { status: 400 })
  }
```

And in the `tx.workOrder.update` call's `data`:

```ts
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(progressStage !== undefined ? { progressStage } : {}),
        ...(mechanicId !== undefined ? { mechanicId } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- workorders.test.ts`
Expected: PASS (all tests in the file, including pre-existing ones)

- [ ] **Step 5: Commit**

```bash
git add app/api/workorders/[id]/route.ts __tests__/api/workorders.test.ts
git commit -m "feat: accept progressStage in PATCH /api/workorders/[id]"
```

---

### Task 4: `lib/workOrderStatus.ts` — progress stage labels and options

**Files:**
- Modify: `lib/workOrderStatus.ts`

**Interfaces:**
- Consumes: `WorkOrderProgressStage` from `@prisma/client` (Task 1).
- Produces: `WORK_ORDER_PROGRESS_STAGE_LABELS`, `WORK_ORDER_PROGRESS_STAGE_OPTIONS` — consumed by Task 8's `TicketCard.tsx` selector.

No test for this step — matches this file's existing convention (its current label/option maps have no dedicated test file either; they're static data, not branching logic).

- [ ] **Step 1: Add the constants**

Append to `lib/workOrderStatus.ts` (and update its import line):

```ts
import { WorkOrderStatus, WorkOrderProgressStage } from '@prisma/client'
```

```ts
export const WORK_ORDER_PROGRESS_STAGE_LABELS: Record<WorkOrderProgressStage, string> = {
  INSPECTING: 'Inspección',
  REPAIRING: 'Reparando',
  WAITING_PARTS: 'Esperando repuestos',
}

export const WORK_ORDER_PROGRESS_STAGE_OPTIONS = Object.values(WorkOrderProgressStage).map(value => ({
  value,
  label: WORK_ORDER_PROGRESS_STAGE_LABELS[value],
}))
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/workOrderStatus.ts
git commit -m "feat: add progress stage labels and options"
```

---

### Task 5: `lib/activeRepairs.ts` — dashboard visibility-rule helper

**Files:**
- Create: `lib/activeRepairs.ts`
- Test: `__tests__/lib/activeRepairs.test.ts`

**Interfaces:**
- Produces: `ACTIVE_REPAIR_GRACE_PERIOD_MS` (number, 24h in ms) and `activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput` — consumed by Task 6's owner dashboard query.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/activeRepairs.test.ts`:

```ts
import { activeRepairsWhere, ACTIVE_REPAIR_GRACE_PERIOD_MS } from '@/lib/activeRepairs'

describe('activeRepairsWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the given owner', () => {
    const where = activeRepairsWhere('owner1') as any
    expect(where.vehicle).toEqual({ ownerId: 'owner1' })
  })

  it('always includes PENDING and IN_PROGRESS', () => {
    const where = activeRepairsWhere('owner1') as any
    expect(where.OR[0]).toEqual({ status: { in: ['PENDING', 'IN_PROGRESS'] } })
  })

  it('includes COMPLETED/CANCELLED only within the 24h grace window', () => {
    const now = new Date('2026-07-30T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    const where = activeRepairsWhere('owner1') as any
    expect(where.OR[1].status).toEqual({ in: ['COMPLETED', 'CANCELLED'] })
    expect(where.OR[1].closedAt.gte).toEqual(new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- activeRepairs.test.ts`
Expected: FAIL with "Cannot find module '@/lib/activeRepairs'"

- [ ] **Step 3: Implement**

Create `lib/activeRepairs.ts`:

```ts
import type { Prisma } from '@prisma/client'

export const ACTIVE_REPAIR_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

export function activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput {
  return {
    vehicle: { ownerId },
    OR: [
      { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- activeRepairs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/activeRepairs.ts __tests__/lib/activeRepairs.test.ts
git commit -m "feat: add activeRepairsWhere visibility-rule helper"
```

---

### Task 6: Owner dashboard query — widen visibility, drop the cap, thread `progressStage`

**Files:**
- Modify: `app/(dashboard)/owner/page.tsx`

**Interfaces:**
- Consumes: `activeRepairsWhere` (Task 5).
- Produces: `activeRepairs` prop passed to `DashboardContent` now includes `progressStage`, and is no longer capped at 3 — consumed by Task 7.

- [ ] **Step 1: Update the query**

In `app/(dashboard)/owner/page.tsx`, add the import:

```ts
import { activeRepairsWhere } from '@/lib/activeRepairs'
```

Replace the `rawVehicles` query's `include` (currently `include: { workOrders: { where: { status: 'IN_PROGRESS' } } }`) so the "at the shop" badge also reflects `PENDING`:

```ts
    prisma.vehicle.findMany({
      where: { ownerId: userId },
      include: { workOrders: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } } },
      orderBy: { createdAt: 'desc' },
    }),
```

Replace the `rawActiveRepairs` query (currently `where: { vehicle: { ownerId: userId }, status: 'IN_PROGRESS' }` with `take: 3`):

```ts
    prisma.workOrder.findMany({
      where: activeRepairsWhere(userId),
      include: { vehicle: true },
      orderBy: { updatedAt: 'desc' },
    }),
```

- [ ] **Step 2: Update the mapping**

Replace the `activeRepairs` mapping:

```ts
  const activeRepairs = rawActiveRepairs.map(o => ({
    id: o.id,
    vehicle: `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}`,
    workOrder: `Orden de trabajo #${o.id.slice(-6).toUpperCase()}`,
    status: o.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    progressStage: o.progressStage as 'INSPECTING' | 'REPAIRING' | 'WAITING_PARTS' | null,
  }))
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `activeRepairs` is passed to `DashboardContent` through a variable, not an inline object literal, so TypeScript's excess-property check doesn't fire even though `DashboardContent`'s prop type doesn't declare `progressStage` until Task 7 — the extra field is silently allowed.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/owner/page.tsx"
git commit -m "feat: widen owner dashboard active-repair visibility rule"
```

---

### Task 7: `DashboardContent.tsx` — 5-stage timeline, Cancelado state, exit animation

**Files:**
- Modify: `app/(dashboard)/owner/DashboardContent.tsx`
- Test: `__tests__/app/owner/DashboardContent.test.ts`

**Interfaces:**
- Consumes: `activeRepairs` prop shape from Task 6 (now includes `progressStage`).
- Produces: exported `timelineCurrentStep` and `timelineStepState` pure functions (tested directly, no rendering needed).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/owner/DashboardContent.test.ts`:

```ts
import { timelineCurrentStep, timelineStepState } from '@/app/(dashboard)/owner/DashboardContent'

describe('timelineCurrentStep', () => {
  it('returns 0 for PENDING', () => {
    expect(timelineCurrentStep('PENDING', null)).toBe(0)
  })

  it('returns 1 for IN_PROGRESS with no progressStage set yet', () => {
    expect(timelineCurrentStep('IN_PROGRESS', null)).toBe(1)
  })

  it('returns 1 for IN_PROGRESS + INSPECTING', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'INSPECTING')).toBe(1)
  })

  it('returns 2 for IN_PROGRESS + REPAIRING', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'REPAIRING')).toBe(2)
  })

  it('returns 3 for IN_PROGRESS + WAITING_PARTS', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'WAITING_PARTS')).toBe(3)
  })

  it('returns 4 for COMPLETED', () => {
    expect(timelineCurrentStep('COMPLETED', null)).toBe(4)
  })
})

describe('timelineStepState', () => {
  it('marks every step done when status is COMPLETED, including the last one', () => {
    expect(timelineStepState(4, 4, 'COMPLETED')).toBe('done')
    expect(timelineStepState(0, 4, 'COMPLETED')).toBe('done')
  })

  it('marks steps before currentStep as done', () => {
    expect(timelineStepState(0, 2, 'IN_PROGRESS')).toBe('done')
  })

  it('marks the currentStep as current', () => {
    expect(timelineStepState(2, 2, 'IN_PROGRESS')).toBe('current')
  })

  it('marks steps after currentStep as pending', () => {
    expect(timelineStepState(3, 2, 'IN_PROGRESS')).toBe('pending')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- DashboardContent.test.ts`
Expected: FAIL — `timelineCurrentStep`/`timelineStepState` aren't exported yet, and don't take a `progressStage`/`status` second argument.

- [ ] **Step 3: Implement — types and pure functions**

In `app/(dashboard)/owner/DashboardContent.tsx`, update the import line to include `AnimatePresence`:

```ts
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
```

Replace the `ActiveRepairSummary` type, `TIMELINE_STEPS`, `timelineCurrentStep`, and `timelineStepState`:

```ts
export type ActiveRepairSummary = {
  id: string
  vehicle: string
  workOrder: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  progressStage: 'INSPECTING' | 'REPAIRING' | 'WAITING_PARTS' | null
}
```

```ts
const TIMELINE_STEPS = ['Recibido', 'Inspección', 'Reparando', 'Esperando repuestos', 'Listo'] as const

export function timelineCurrentStep(
  status: ActiveRepairSummary['status'],
  progressStage: ActiveRepairSummary['progressStage']
): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') {
    if (progressStage === 'REPAIRING') return 2
    if (progressStage === 'WAITING_PARTS') return 3
    return 1
  }
  return 4
}

type TimelineStepState = 'done' | 'current' | 'pending'

export function timelineStepState(
  index: number,
  currentStep: number,
  status: ActiveRepairSummary['status']
): TimelineStepState {
  if (status === 'COMPLETED') return 'done'
  if (index < currentStep) return 'done'
  if (index === currentStep) return 'current'
  return 'pending'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- DashboardContent.test.ts`
Expected: PASS

- [ ] **Step 5: Replace the render block**

Replace the entire "Active repairs — full-width timeline" section (the `{activeRepairs.length > 0 && (...)}` block) with:

```tsx
          {/* Active repairs — full-width timeline */}
          {activeRepairs.length > 0 && (
            <section className="flex flex-col gap-5">
              <motion.h2 {...enter(0.24)} className={cn(sectionLabel, 'px-1')}>
                Reparaciones en curso
              </motion.h2>
              <AnimatePresence mode="popLayout">
                {activeRepairs.map((repair, r) => {
                  const exitAnim = {
                    opacity: 0,
                    scale: 0.96,
                    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp },
                  }

                  if (repair.status === 'CANCELLED') {
                    return (
                      <motion.div key={repair.id} {...enter(0.28 + r * 0.08)} exit={exitAnim} className="bezel">
                        <div className="bezel-core flex flex-wrap items-center justify-between gap-3 p-6 sm:p-8">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                              {repair.vehicle}
                            </span>
                            <span className="text-sm text-muted-foreground">{repair.workOrder}</span>
                          </div>
                          <Badge variant="danger">
                            <BadgeDot />
                            Cancelado
                          </Badge>
                        </div>
                      </motion.div>
                    )
                  }

                  const currentStep = timelineCurrentStep(repair.status, repair.progressStage)
                  const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                  const isDone = repair.status === 'COMPLETED'

                  return (
                    <motion.div key={repair.id} {...enter(0.28 + r * 0.08)} exit={exitAnim} className="bezel">
                      <div className="bezel-core flex flex-col gap-2 p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                              {repair.vehicle}
                            </span>
                            <span className="text-sm text-muted-foreground">{repair.workOrder}</span>
                          </div>
                          <Badge variant={isDone ? 'ok' : 'active'}>
                            <BadgeDot className={isDone ? undefined : 'animate-pulse'} />
                            {isDone ? 'Listo' : 'En progreso'}
                          </Badge>
                        </div>

                        <div className="relative py-9">
                          <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-white/[0.08]" />
                          <motion.div
                            className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-primary shadow-[0_0_12px_rgba(242,179,80,0.6)]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.fluid, delay: 0.5 }}
                          />
                          <div className="relative flex items-start justify-between">
                            {TIMELINE_STEPS.map((label, i) => {
                              const state = timelineStepState(i, currentStep, repair.status)
                              return (
                                <motion.div
                                  key={label}
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{
                                    duration: motionTokens.duration.fast,
                                    ease: motionTokens.easing.smooth,
                                    delay: 0.55 + i * 0.08,
                                  }}
                                  className="relative z-10 flex flex-col items-center gap-2.5"
                                  style={{ width: `${100 / TIMELINE_STEPS.length}%` }}
                                >
                                  {state === 'done' && (
                                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                                      <CheckIcon className="size-3" strokeWidth={2} />
                                    </span>
                                  )}
                                  {state === 'current' && (
                                    <motion.span
                                      animate={{ scale: [1, 1.15, 1] }}
                                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                      className="flex size-7 items-center justify-center rounded-full bg-card ring-1 ring-primary shadow-[0_0_18px_rgba(242,179,80,0.45)]"
                                    >
                                      <span className="size-2 rounded-full bg-primary" />
                                    </motion.span>
                                  )}
                                  {state === 'pending' && (
                                    <span className="size-6 rounded-full bg-white/[0.05] ring-1 ring-white/[0.1]" />
                                  )}
                                  <span
                                    className={cn(
                                      'whitespace-nowrap text-center font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em] sm:text-[0.625rem]',
                                      TIMELINE_STEP_LABEL_CLASS[state]
                                    )}
                                  >
                                    {label}
                                  </span>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </section>
          )}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this also validates Task 6's `page.tsx` mapping now matches `ActiveRepairSummary`)

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/owner/DashboardContent.tsx" "__tests__/app/owner/DashboardContent.test.ts"
git commit -m "feat: redesign owner dashboard timeline with real progress stages"
```

---

### Task 8: Mechanic board — progress-stage selector on `TicketCard`

**Files:**
- Modify: `app/(dashboard)/mechanic/board/TicketCard.tsx`
- Modify: `app/(dashboard)/mechanic/board/page.tsx:72-84` (ticket mapping)

**Interfaces:**
- Consumes: `WORK_ORDER_PROGRESS_STAGE_OPTIONS` (Task 4); `PATCH /api/workorders/[id]` accepting `progressStage` (Task 3).
- Produces: `TicketCardData.progressStage` field, read by `TicketDialog` (no change needed there — it just receives the wider type).

No dedicated unit test — this is a UI-only addition (button/select markup and a fetch call), matching this file's existing untested `handleStatusChange` pattern; the underlying route behavior is already covered by Task 3's tests.

- [ ] **Step 1: Add `progressStage` to `TicketCardData` and the page mapping**

In `TicketCard.tsx`, update the type import and interface:

```ts
import type { WorkOrderStatus, ServiceItemType, WorkOrderProgressStage } from '@prisma/client'
```

```ts
export interface TicketCardData {
  id: string
  title: string
  description: string | null
  status: WorkOrderStatus
  progressStage: WorkOrderProgressStage | null
  vehicleId: string
  vehicleLabel: string
  vehiclePlate: string | null
  mechanicId: string
  mechanicName: string
  serviceItems: { id: string; type: ServiceItemType }[]
  createdAt: string
}
```

In `app/(dashboard)/mechanic/board/page.tsx`, add `progressStage: w.progressStage,` to the `tickets={workOrders.map(w => ({ ... }))}` mapping, right after `status: w.status,`.

- [ ] **Step 2: Add the selector and its handler**

In `TicketCard.tsx`, add the import:

```ts
import {
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_BADGE_VARIANT,
  WORK_ORDER_PROGRESS_STAGE_OPTIONS,
} from '@/lib/workOrderStatus'
```

Add the handler inside the `TicketCard` component, next to `handleStatusChange`:

```ts
  async function handleProgressStageChange(progressStage: string) {
    setError(null)
    setUpdating(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressStage }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo actualizar la etapa')
        return
      }
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }
```

Add the selector right after the existing status `<Select>` block (before the closing `</div>` of `bezel-core`):

```tsx
        {ticket.status === 'IN_PROGRESS' && (
          <Select
            value={ticket.progressStage ?? 'INSPECTING'}
            onValueChange={handleProgressStageChange}
            disabled={updating}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as a mechanic, drag/set a ticket to "En progreso", confirm the new stage selector appears and defaults to "Inspección", change it to "Reparando"/"Esperando repuestos" and confirm it persists after a refresh. Then confirm the owner dashboard (logged in as that vehicle's owner) shows the matching stage as the pulsing current step.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/mechanic/board/TicketCard.tsx" "app/(dashboard)/mechanic/board/page.tsx"
git commit -m "feat: add progress-stage selector to mechanic board tickets"
```

---

## Final Verification

- [ ] Run the full suite: `npm test` — all tests pass.
- [ ] Run `npm run lint` — no new errors.
- [ ] Run `npx tsc --noEmit` — no errors.
- [ ] Manual pass on the owner dashboard: a vehicle with a `PENDING` work order shows "Recibido" pulsing; moving it through `IN_PROGRESS`/each `progressStage` moves the pulse; `COMPLETED` shows all steps checked with an "ok"-styled badge; `CANCELLED` shows the compact red "Cancelado" card instead of a stepper; a `COMPLETED`/`CANCELLED` order older than 24h (adjust `closedAt` manually via Prisma Studio to verify) disappears from the dashboard.
