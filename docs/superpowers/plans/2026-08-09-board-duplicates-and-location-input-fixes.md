# Board Duplicates & Location Input Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A vehicle appears exactly once on the mechanic board and cannot be received twice; the workshop address field never pops its Google suggestion list over an already-set value and is available (with coordinates) in the first-run setup wizard.

**Architecture:** Three independent fixes. (1) The "vehicle in service" rule becomes a shared Prisma `where` builder in `lib/activeRepairs.ts` — the check-in API rejects a second receive, the board query drops long-closed tickets, and the "Programado" column skips turnos whose vehicle is already in service. (2) `PlaceLocationInput` only queries Google Places for text the user typed *since* the last committed address, and its value type admits an address without coordinates so the no-API-key fallback still works; the workshop setup wizard swaps its plain text input for that component and `POST /api/workshop` persists `latitude`/`longitude`/`googlePlaceId`. (3) The progress-stage workflow order becomes a single ordered array in `lib/workOrderStatus.ts` that drives both the mechanic's stage dropdown and the owner timeline, and it is reordered to `Inspección → Esperando repuestos → Reparando`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma v7, NextAuth v4, Jest (node env), `@vis.gl/react-google-maps`, Tailwind v4, pnpm.

## Global Constraints

- **No new dependencies.** Everything needed is already installed.
- **No database migration.** No `prisma/schema.prisma` change in this plan; `latitude`, `longitude`, `googlePlaceId` and `closedAt` already exist.
- **Language split (CLAUDE.md):** all user-facing copy in Latin-American Spanish; all commits, comments, test names, identifiers and this doc in English.
- **Package manager is pnpm** — `pnpm test`, `pnpm lint`, `pnpm build`. Never `npm run`.
- **Next.js 16 is not the Next.js you know (AGENTS.md):** before touching routing/params/server-component APIs, read the relevant guide under `node_modules/next/dist/docs/`. Route handlers here take `{ params }: { params: Promise<{ id: string }> }` — keep that shape.
- **Prisma v7:** the client is adapter-based via `lib/prisma.ts`; the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`.
- **Tests are node-environment only** (`jest.config.js` sets `testEnvironment: 'node'`). There is no jsdom/React Testing Library — do not add one. Component behaviour is covered by exported pure functions (see `__tests__/app/owner/DashboardContent.test.ts`) or by the manual QA checklist in Task 7.
- **Commit after every task**, English `type: subject` messages matching the existing log (`fix:`, `feat:`, `chore:`).
- **Before opening the PR:** `pnpm test` (writes `coverage/lcov.info`), then a SonarQube pass, then the PR in the `## Summary` / `## Test plan` format used since PR #1.

### Verified facts (do not re-derive)

- The only code path that creates a `WorkOrder` is `POST /api/appointments/[id]/check-in` — that is "receiving" a vehicle. There is no other create call in `app/` or `lib/`.
- The board query in `app/(dashboard)/mechanic/board/page.tsx` currently has **no** status filter, so every `COMPLETED`/`CANCELLED` ticket the workshop ever produced stays on the board forever. That alone shows one vehicle several times.
- `lib/activeRepairs.ts` already implements the "open, or closed within 24h" rule for the owner dashboard (`ACTIVE_REPAIR_GRACE_PERIOD_MS`). The board reuses it — do not invent a second grace period.
- The progress-stage order lives in **two** places today and both must change: `WORK_ORDER_PROGRESS_STAGE_OPTIONS` in `lib/workOrderStatus.ts` derives from `Object.values(WorkOrderProgressStage)` (runtime value: `['INSPECTING', 'REPAIRING', 'WAITING_PARTS']`, i.e. the `schema.prisma` declaration order), and `TIMELINE_STEPS` in `DashboardContent.tsx` is the hand-written `['Recibido', 'Inspección', 'Reparando', 'Esperando repuestos', 'Listo']`. The required workflow is **Recibido → Inspección → Esperando repuestos → Reparando → Listo** — you inspect, wait for the parts, then do the work. Task 6 reorders it and collapses the two sources into one ordered array so they can never disagree again.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/activeRepairs.ts` (modify) | Single home for "which work orders count as open / still worth showing" — owner dashboard, board, and check-in guard all read from here | 1, 2 |
| `app/api/appointments/[id]/check-in/route.ts` (modify) | Rejects receiving a vehicle that already has an open ticket at this workshop | 1 |
| `__tests__/api/appointments-checkin.test.ts` (modify) | Covers the new 409 | 1 |
| `__tests__/lib/activeRepairs.test.ts` (modify) | Covers the two new `where` builders | 2 |
| `app/(dashboard)/mechanic/board/page.tsx` (modify) | Uses the new `where` builders instead of inline filters | 2 |
| `components/shared/PlaceLocationInput.tsx` (modify) | Suggestion list only opens for user-typed text; value type allows an address without coordinates; optional `inputId` for label association | 3, 4, 5 |
| `app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx` (modify) | Derives "has location" from the value instead of a parallel `useState` | 4 |
| `components/workshop/WorkshopSetupForm.tsx` (modify) | First-run wizard uses Google Places for the address and submits coordinates | 5 |
| `app/api/workshop/route.ts` (modify) | `POST` persists optional location fields, maps duplicate-place `P2002` to a Spanish 409 | 5 |
| `__tests__/api/workshop.test.ts` (modify) | Covers the new `POST` behaviour | 5 |
| `lib/workOrderStatus.ts` (modify) | Single ordered stage array (`INSPECTING → WAITING_PARTS → REPAIRING`) driving the dropdown and the timeline | 6 |
| `__tests__/lib/workOrderStatus.test.ts` (create) | Pins the stage order and its Spanish labels | 6 |
| `app/(dashboard)/owner/DashboardContent.tsx` (modify) | Builds `TIMELINE_STEPS` and `timelineCurrentStep` from the shared order instead of its own hardcoded list | 6 |
| `__tests__/app/owner/DashboardContent.test.ts` (modify) | Updates the step-index expectations to the new order | 6 |

---

### Task 1: Block receiving a vehicle that is already in service

The bug: `POST /api/appointments/[id]/check-in` only checks that *this appointment* has no work order. Two turnos for the same vehicle → two check-ins → two open tickets → the vehicle shows twice on the board.

**Files:**
- Modify: `lib/activeRepairs.ts:1-16`
- Modify: `app/api/appointments/[id]/check-in/route.ts:1-46`
- Test: `__tests__/api/appointments-checkin.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[]` and `CLOSED_WORK_ORDER_STATUSES: WorkOrderStatus[]` exported from `lib/activeRepairs.ts` (Task 2 reuses both).

- [ ] **Step 1: Add the shared status constants**

Replace the whole of `lib/activeRepairs.ts` with:

```ts
import type { Prisma, WorkOrderStatus } from '@prisma/client'

export const ACTIVE_REPAIR_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

// A vehicle counts as "in service" while it has a work order in one of these states.
export const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS']
export const CLOSED_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

export function activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput {
  return {
    vehicle: { ownerId },
    OR: [
      { status: { in: OPEN_WORK_ORDER_STATUSES } },
      {
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
  }
}
```

- [ ] **Step 2: Run the existing suite to confirm the refactor is behaviour-neutral**

Run: `pnpm test __tests__/lib/activeRepairs.test.ts`
Expected: PASS (3 tests) — the constants serialize to the same arrays the tests already assert.

- [ ] **Step 3: Write the failing test**

In `__tests__/api/appointments-checkin.test.ts`, extend the prisma mock at the top of the file (line 3-8) to:

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
    workOrder: { create: jest.fn(), findFirst: jest.fn() },
  },
}))
```

Add the handle next to the other mock handles (after line 17):

```ts
const mockWorkOrderFindFirst = prisma.workOrder.findFirst as jest.Mock
```

Replace `beforeEach(() => jest.clearAllMocks())` with:

```ts
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkOrderFindFirst.mockResolvedValue(null)
  })
```

Add this test immediately before the final `creates a WorkOrder from the appointment and returns 201` test:

```ts
  it('returns 409 when the vehicle already has an open work order at this workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({
      id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: null,
      title: 'Cambio de aceite', notes: null, vehicleId: 'v1',
    })
    mockWorkOrderFindFirst.mockResolvedValue({ id: 'wo-open' })

    const res = await POST(makeRequest(), { params })

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Este vehículo ya está en servicio en tu taller' })
    expect(mockWorkOrderFindFirst).toHaveBeenCalledWith({
      where: {
        vehicleId: 'v1',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        mechanic: { workshopId: 'ws1' },
      },
      select: { id: true },
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test __tests__/api/appointments-checkin.test.ts`
Expected: FAIL — the new test gets `201` instead of `409` (the route never calls `findFirst`).

- [ ] **Step 5: Implement the guard**

In `app/api/appointments/[id]/check-in/route.ts`, add the import next to the existing ones:

```ts
import { OPEN_WORK_ORDER_STATUSES } from '@/lib/activeRepairs'
```

Then insert this block after the `if (appointment.status !== 'SCHEDULED' || appointment.workOrder)` check and before the `try {`:

```ts
  // A vehicle can only be received once: block a second check-in while an earlier
  // ticket for the same vehicle is still open at this workshop.
  const openWorkOrder = await prisma.workOrder.findFirst({
    where: {
      vehicleId: appointment.vehicleId,
      status: { in: OPEN_WORK_ORDER_STATUSES },
      mechanic: { workshopId: session.user.workshopId },
    },
    select: { id: true },
  })
  if (openWorkOrder) {
    return NextResponse.json({ error: 'Este vehículo ya está en servicio en tu taller' }, { status: 409 })
  }
```

The scope is deliberately `mechanic: { workshopId }` and not global: a stale open ticket at another workshop must not block this one. The 409 body is already surfaced by `AppointmentCard.tsx:29-31`, which renders `data.error` in its alert banner — no client change needed.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm test __tests__/api/appointments-checkin.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/activeRepairs.ts app/api/appointments/[id]/check-in/route.ts __tests__/api/appointments-checkin.test.ts
git commit -m "fix: reject check-in when the vehicle already has an open work order"
```

---

### Task 2: Show each vehicle once on the mechanic board

Two display leaks remain: closed tickets never leave the board, and a second turno for a vehicle already in service still sits in "Programado".

**Files:**
- Modify: `lib/activeRepairs.ts` (append two builders)
- Modify: `app/(dashboard)/mechanic/board/page.tsx:29-43`
- Test: `__tests__/lib/activeRepairs.test.ts`

**Interfaces:**
- Consumes: `OPEN_WORK_ORDER_STATUSES`, `CLOSED_WORK_ORDER_STATUSES`, `ACTIVE_REPAIR_GRACE_PERIOD_MS` from Task 1.
- Produces: `boardWorkOrdersWhere(workshopId: string): Prisma.WorkOrderWhereInput` and `pendingArrivalAppointmentsWhere(workshopId: string): Prisma.AppointmentWhereInput`.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/lib/activeRepairs.test.ts` (and extend the import on line 1 to
`import { activeRepairsWhere, boardWorkOrdersWhere, pendingArrivalAppointmentsWhere, ACTIVE_REPAIR_GRACE_PERIOD_MS } from '@/lib/activeRepairs'`):

```ts
describe('boardWorkOrdersWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the workshop', () => {
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.mechanic).toEqual({ workshopId: 'ws1' })
  })

  it('always includes open tickets', () => {
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.OR[0]).toEqual({ status: { in: ['PENDING', 'IN_PROGRESS'] } })
  })

  it('includes closed tickets only within the 24h grace window', () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.OR[1].status).toEqual({ in: ['COMPLETED', 'CANCELLED'] })
    expect(where.OR[1].closedAt.gte).toEqual(new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS))
  })
})

describe('pendingArrivalAppointmentsWhere', () => {
  it('matches this workshop\'s SCHEDULED appointments that have no work order yet', () => {
    const where = pendingArrivalAppointmentsWhere('ws1') as any
    expect(where.workshopId).toBe('ws1')
    expect(where.status).toBe('SCHEDULED')
    expect(where.workOrder).toBeNull()
  })

  it('excludes vehicles that already have an open ticket at this workshop', () => {
    const where = pendingArrivalAppointmentsWhere('ws1') as any
    expect(where.vehicle).toEqual({
      workOrders: {
        none: { status: { in: ['PENDING', 'IN_PROGRESS'] }, mechanic: { workshopId: 'ws1' } },
      },
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test __tests__/lib/activeRepairs.test.ts`
Expected: FAIL — `boardWorkOrdersWhere is not a function` / `pendingArrivalAppointmentsWhere is not a function`.

- [ ] **Step 3: Implement the two builders**

Append to `lib/activeRepairs.ts`:

```ts
// The board is a live workspace, not an archive: open tickets plus anything closed
// in the last 24h, so a returning vehicle never shows next to its own old tickets.
export function boardWorkOrdersWhere(workshopId: string): Prisma.WorkOrderWhereInput {
  return {
    mechanic: { workshopId },
    OR: [
      { status: { in: OPEN_WORK_ORDER_STATUSES } },
      {
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
  }
}

// Turnos still waiting for the vehicle to arrive. A vehicle already in service is
// hidden here — it is on the board as a ticket, and check-in would be rejected.
export function pendingArrivalAppointmentsWhere(workshopId: string): Prisma.AppointmentWhereInput {
  return {
    workshopId,
    status: 'SCHEDULED',
    workOrder: null,
    vehicle: {
      workOrders: {
        none: { status: { in: OPEN_WORK_ORDER_STATUSES }, mechanic: { workshopId } },
      },
    },
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test __tests__/lib/activeRepairs.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Wire the board page to the builders**

In `app/(dashboard)/mechanic/board/page.tsx`, add to the imports:

```ts
import { boardWorkOrdersWhere, pendingArrivalAppointmentsWhere } from '@/lib/activeRepairs'
```

Replace the two `where` clauses inside `Promise.all` (lines 30-36) so the calls read:

```ts
    prisma.appointment.findMany({
      where: pendingArrivalAppointmentsWhere(workshopId),
      include: { vehicle: { include: { owner: { select: { name: true } } } } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.workOrder.findMany({
      where: boardWorkOrdersWhere(workshopId),
      include: {
        vehicle: { select: { nickname: true, year: true, make: true, model: true, plate: true } },
        mechanic: { select: { id: true, name: true, email: true } },
        serviceItems: { select: { id: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
```

Everything else in the file (the `mechanics` query, the mapping, the JSX) stays as is.

- [ ] **Step 6: Type-check and lint**

Run: `pnpm lint && pnpm build`
Expected: no errors. (`pnpm build` is the type-check gate — there is no separate `tsc` script.)

- [ ] **Step 7: Commit**

```bash
git add lib/activeRepairs.ts __tests__/lib/activeRepairs.test.ts "app/(dashboard)/mechanic/board/page.tsx"
git commit -m "fix: show each vehicle once on the mechanic board"
```

---

### Task 3: Stop the Places suggestion list from opening over an already-set address

The bug: `AutocompleteLocationInput` seeds `inputValue` from `initialAddress`, and `useAutocompleteSuggestions` fires on any non-empty input — so the dropdown opens on mount over a saved address, and opens *again* right after picking a suggestion (selecting sets `inputValue` to the formatted address, which re-triggers the effect). Both make a set value look unset. Gating the fetch — not just the rendering — also avoids paying for Places calls nobody asked for.

**Files:**
- Modify: `components/shared/PlaceLocationInput.tsx:42-100`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: no signature change — `PlaceLocationInputProps` and `PlaceLocationValue` are untouched here (Task 4 changes the value type).

- [ ] **Step 1: Track the committed address and query only user-typed text**

In `AutocompleteLocationInput`, replace the two state/hook lines (currently lines 49-51):

```tsx
  const places = useMapsLibrary('places')
  const [inputValue, setInputValue] = useState(initialAddress)
  const { suggestions, resetSession } = useAutocompleteSuggestions(inputValue)
```

with:

```tsx
  const places = useMapsLibrary('places')
  const [inputValue, setInputValue] = useState(initialAddress)
  const [committedAddress, setCommittedAddress] = useState(initialAddress)
  // Only query Places for text typed since the last committed address. Passing '' makes
  // the hook clear its list without a request, which keeps the dropdown shut on mount
  // and after a pick — both moments where the field already holds a valid address.
  const { suggestions, resetSession } = useAutocompleteSuggestions(
    inputValue === committedAddress ? '' : inputValue
  )
```

- [ ] **Step 2: Commit the address on selection**

In the same component, inside `handleSuggestionClick`, replace:

```tsx
      setInputValue(place.formattedAddress ?? '')
      resetSession()
```

with:

```tsx
      setInputValue(place.formattedAddress ?? '')
      setCommittedAddress(place.formattedAddress ?? '')
      resetSession()
```

Leave the `useCallback` dependency array as `[places, onSelect, resetSession]` — `useState` setters are stable and `react-hooks/exhaustive-deps` does not ask for them. Step 3 confirms this.

- [ ] **Step 3: Lint and type-check**

Run: `pnpm lint && pnpm build`
Expected: no errors, no `react-hooks/exhaustive-deps` warning.

- [ ] **Step 4: Manual verification (requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)**

Run: `docker compose up -d db` then `pnpm dev`. Log in as a mechanic whose workshop already has an address and open `/mechanic/settings`.
Expected: the address field shows the saved address with **no** dropdown. Typing one character opens the suggestion list; clicking a suggestion fills the field and closes the list, and it stays closed.

- [ ] **Step 5: Commit**

```bash
git add components/shared/PlaceLocationInput.tsx
git commit -m "fix: keep Places suggestions closed over an already-set address"
```

---

### Task 4: Allow an address without coordinates in `PlaceLocationValue`

Preparation for Task 5. `ManualLocationInput` (the no-API-key fallback) only emits once address *and* both coordinates are filled. The setup wizard will read its address from this value, so a mechanic running without a Maps key would be unable to finish setup. Making the coordinates nullable is the honest model: an address is valid on its own, and each form decides whether it has enough to save.

**Files:**
- Modify: `components/shared/PlaceLocationInput.tsx:9-21, 102-166`
- Modify: `app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx:72-78, 209-212`

**Interfaces:**
- Consumes: the committed-address state from Task 3.
- Produces:
  - `PlaceLocationValue = { address: string; latitude: number | null; longitude: number | null; googlePlaceId: string | null }`
  - `PlaceLocationInputProps` gains `inputId?: string` (Task 5 uses it to associate a `<Label htmlFor>`).

- [ ] **Step 1: Widen the value type and thread `inputId`**

In `components/shared/PlaceLocationInput.tsx`, replace the interface block and the top-level component (lines 9-40) with:

```tsx
export interface PlaceLocationValue {
  address: string
  latitude: number | null
  longitude: number | null
  googlePlaceId: string | null
}

interface PlaceLocationInputProps {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress?: string
  initialLatitude?: number | null
  initialLongitude?: number | null
  inputId?: string
}

export function PlaceLocationInput({
  onSelect,
  initialAddress = '',
  initialLatitude = null,
  initialLongitude = null,
  inputId,
}: PlaceLocationInputProps) {
  if (!hasGoogleMapsKey) {
    return (
      <ManualLocationInput
        onSelect={onSelect}
        initialAddress={initialAddress}
        initialLatitude={initialLatitude}
        initialLongitude={initialLongitude}
        inputId={inputId}
      />
    )
  }
  return <AutocompleteLocationInput onSelect={onSelect} initialAddress={initialAddress} inputId={inputId} />
}
```

- [ ] **Step 2: Accept `inputId` in the autocomplete branch**

Change the `AutocompleteLocationInput` signature to:

```tsx
function AutocompleteLocationInput({
  onSelect,
  initialAddress,
  inputId,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
  inputId?: string
}) {
```

and add the id to its `<Input>`:

```tsx
      <Input
        id={inputId}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder="Buscá tu taller en Google Maps"
        className="h-11"
      />
```

- [ ] **Step 3: Emit partial values from the manual fallback**

Replace `ManualLocationInput` (from `function ManualLocationInput(` to the end of the file) with:

```tsx
function parseCoordinate(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function ManualLocationInput({
  onSelect,
  initialAddress,
  initialLatitude,
  initialLongitude,
  inputId,
}: {
  onSelect: (value: PlaceLocationValue) => void
  initialAddress: string
  initialLatitude: number | null
  initialLongitude: number | null
  inputId?: string
}) {
  const [address, setAddress] = useState(initialAddress)
  const [latitude, setLatitude] = useState(initialLatitude !== null ? String(initialLatitude) : '')
  const [longitude, setLongitude] = useState(initialLongitude !== null ? String(initialLongitude) : '')

  // Emit on every edit: an address without coordinates is a valid partial value, and
  // the consuming form decides whether it has enough to save.
  function emit(next: { address: string; latitude: string; longitude: string }) {
    onSelect({
      address: next.address,
      latitude: parseCoordinate(next.latitude),
      longitude: parseCoordinate(next.longitude),
      googlePlaceId: null,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={inputId}
        value={address}
        onChange={e => {
          setAddress(e.target.value)
          emit({ address: e.target.value, latitude, longitude })
        }}
        placeholder="Dirección del taller"
        className="h-11"
      />
      <div className="flex gap-2">
        <Input
          value={latitude}
          onChange={e => {
            setLatitude(e.target.value)
            emit({ address, latitude: e.target.value, longitude })
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
            emit({ address, latitude, longitude: e.target.value })
          }}
          placeholder="Longitud"
          type="number"
          step="any"
          className="h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Google Maps no está configurado. Ingresá la dirección y las coordenadas manualmente (podés obtenerlas
        haciendo clic derecho en Google Maps y copiando &quot;Latitud, Longitud&quot;).
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Derive `hasLocation` in the settings form**

In `app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx`, replace the location state block (lines 72-78):

```tsx
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: initialAddress,
    latitude: initialLatitude ?? 0,
    longitude: initialLongitude ?? 0,
    googlePlaceId: initialGooglePlaceId,
  })
  const [hasLocation, setHasLocation] = useState(initialLatitude !== null && initialLongitude !== null)
```

with:

```tsx
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: initialAddress,
    latitude: initialLatitude,
    longitude: initialLongitude,
    googlePlaceId: initialGooglePlaceId,
  })
  const hasLocation = location.latitude !== null && location.longitude !== null
```

and simplify the `onSelect` handler (lines 209-212) to:

```tsx
                    onSelect={setLocation}
```

The `latitude: hasLocation ? location.latitude : undefined` lines in the PATCH body stay exactly as they are — with the derived flag they now mean "send coordinates only when we actually have both", which is what they always intended.

- [ ] **Step 5: Lint, type-check and run the suite**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: no errors; the whole Jest suite still passes (no test touches these files).

- [ ] **Step 6: Manual verification**

With `pnpm dev` running, open `/mechanic/settings` as a workshop ADMIN, pick a new address from the dropdown, save.
Expected: "Configuración guardada." appears; after a reload the new address is shown and the "Todavía no configuraste la ubicación" warning is absent.

- [ ] **Step 7: Commit**

```bash
git add components/shared/PlaceLocationInput.tsx "app/(dashboard)/mechanic/settings/WorkshopSettingsForm.tsx"
git commit -m "refactor: allow an address without coordinates in PlaceLocationValue"
```

---

### Task 5: Google Places address in the workshop setup wizard

`components/workshop/WorkshopSetupForm.tsx` — the first screen a mechanic sees after registering — collects the address as a plain string and never captures coordinates, so a brand-new workshop cannot appear in the owner's distance search until someone revisits Settings.

**Files:**
- Modify: `components/workshop/WorkshopSetupForm.tsx`
- Modify: `app/api/workshop/route.ts:1-40`
- Test: `__tests__/api/workshop.test.ts`

**Interfaces:**
- Consumes: `PlaceLocationInput`, `PlaceLocationValue` (nullable coordinates, `inputId` prop) from Task 4; `GoogleMapsProvider` from `components/shared/GoogleMapsProvider`.
- Produces: `POST /api/workshop` accepts optional `latitude: number`, `longitude: number`, `googlePlaceId: string` alongside the existing required `name`, `address`, `phone`, `email`.

- [ ] **Step 1: Write the failing API tests**

In `__tests__/api/workshop.test.ts`, add the Prisma import below the existing imports (line 16):

```ts
import { Prisma } from '@prisma/client'
```

Append these two tests inside the existing `describe('POST /api/workshop')` block:

```ts
  it('persists the Google Places location when provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1' })

    const res = await POST(makeRequest('POST', {
      ...validBody,
      latitude: -34.6037,
      longitude: -58.3816,
      googlePlaceId: 'place-1',
    }))

    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: {
        name: 'AutoShop',
        address: '123 Main St',
        phone: '555-0100',
        email: 'shop@example.com',
        latitude: -34.6037,
        longitude: -58.3816,
        googlePlaceId: 'place-1',
      },
    })
  })

  it('returns 409 when another workshop already uses that Google place', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.8.0' })
    )

    const res = await POST(makeRequest('POST', { ...validBody, googlePlaceId: 'place-1' }))

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'Ya hay un taller registrado en esa ubicación' })
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test __tests__/api/workshop.test.ts`
Expected: FAIL — the create call omits the location fields, and the duplicate-place case returns `500`.

- [ ] **Step 3: Persist the location fields in `POST /api/workshop`**

In `app/api/workshop/route.ts`, change the client import on line 3 to:

```ts
import { Prisma, WorkshopSpecialty } from '@prisma/client'
```

Then replace the body of the `try` block in `POST` (lines 18-39) with:

```ts
  try {
    const { name, address, phone, email, latitude, longitude, googlePlaceId } = await request.json()

    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workshop = await prisma.$transaction(async (tx) => {
      const ws = await tx.workshop.create({
        data: {
          name,
          address,
          phone,
          email,
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
        },
      })
      await tx.user.update({
        where: { id: session.user.id },
        data: { workshopId: ws.id, workshopRole: 'ADMIN' },
      })
      return ws
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya hay un taller registrado en esa ubicación' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
```

The spreads keep the existing "creates workshop … returns 201" test green: with no location in the body, `create` is still called with exactly the four original fields.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test __tests__/api/workshop.test.ts`
Expected: PASS — the whole file, including the pre-existing POST/PATCH tests.

- [ ] **Step 5: Swap the wizard's address field for the Places input**

In `components/workshop/WorkshopSetupForm.tsx`, add to the imports:

```tsx
import { GoogleMapsProvider } from '@/components/shared/GoogleMapsProvider'
import { PlaceLocationInput, type PlaceLocationValue } from '@/components/shared/PlaceLocationInput'
```

Replace the component's state and `handleSubmit` (lines 17-54) with:

```tsx
  const { update } = useSession()
  const router = useRouter()
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: '',
    latitude: null,
    longitude: null,
    googlePlaceId: null,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    if (!location.address) {
      setError('Elegí la dirección del taller de la lista de Google Maps.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          address: location.address,
          latitude: location.latitude ?? undefined,
          longitude: location.longitude ?? undefined,
          googlePlaceId: location.googlePlaceId ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'No se pudo crear el taller')
        return
      }

      await update()
      router.push('/mechanic')
      router.refresh()
    } catch {
      setError('No se pudo crear el taller')
    } finally {
      setLoading(false)
    }
  }
```

`form.elements` is read before the first `await` — `e.currentTarget` is null afterwards.

- [ ] **Step 6: Replace the address markup**

In the same file, replace the Dirección field block (lines 78-82):

```tsx
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-address" className={labelClass}>Dirección</Label>
              <Input id="ws-address" name="address" type="text" required
                placeholder="Av. Corrientes 1234, Ciudad, Prov." />
            </div>
```

with:

```tsx
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-address" className={labelClass}>Dirección</Label>
              <GoogleMapsProvider>
                <PlaceLocationInput inputId="ws-address" onSelect={setLocation} />
              </GoogleMapsProvider>
            </div>
```

Leave the name / phone / email fields and the submit button untouched. `Input` is still imported and used by those fields.

- [ ] **Step 7: Lint, type-check, full suite**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 8: Manual verification**

Register a fresh mechanic account (`/register` → role MECHANIC) so the app redirects to `/workshop/setup`.
Expected: typing in Dirección shows Google suggestions; submitting without picking one shows "Elegí la dirección del taller de la lista de Google Maps."; picking one and submitting lands on `/mechanic`. Confirm in `npx prisma studio` that the new `Workshop` row has `latitude`, `longitude` and `googlePlaceId` set, then confirm the workshop shows up in an owner's `/owner/schedule` workshop search.

- [ ] **Step 9: Commit**

```bash
git add components/workshop/WorkshopSetupForm.tsx app/api/workshop/route.ts __tests__/api/workshop.test.ts
git commit -m "feat: use Google Places for the workshop setup address"
```

---

### Task 6: Reorder the service stages to Inspección → Esperando repuestos → Reparando

The workflow is inspect the vehicle, wait for the parts, then do the work — so `WAITING_PARTS` must sit **before** `REPAIRING` everywhere: the mechanic's stage dropdown on `TicketCard`, and the owner's timeline.

The order is currently duplicated — the dropdown inherits it from the `schema.prisma` enum declaration via `Object.values(WorkOrderProgressStage)`, the timeline hardcodes its own label list, and `timelineCurrentStep` hardcodes the index of each stage a third time. This task makes `WORK_ORDER_PROGRESS_STAGE_ORDER` the one source all three read from, so the reorder happens in exactly one line and cannot be applied half-way.

Note this changes only presentation order — no `schema.prisma`, enum value, or stored data changes, so existing work orders keep their stage and just render in the new position.

**Files:**
- Modify: `lib/workOrderStatus.ts:15-24`
- Create: `__tests__/lib/workOrderStatus.test.ts`
- Modify: `app/(dashboard)/owner/DashboardContent.tsx:49-62`
- Modify: `__tests__/app/owner/DashboardContent.test.ts:1-27`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `WORK_ORDER_PROGRESS_STAGE_ORDER: WorkOrderProgressStage[]` from `lib/workOrderStatus.ts` — `['INSPECTING', 'WAITING_PARTS', 'REPAIRING']`.
  - `TIMELINE_STEPS: string[]` becomes an export of `app/(dashboard)/owner/DashboardContent.tsx`, derived from that order.
  - `timelineCurrentStep(status, progressStage)` keeps its signature; its return values change: `WAITING_PARTS → 2`, `REPAIRING → 3` (they were 3 and 2).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/workOrderStatus.test.ts`:

```ts
import {
  WORK_ORDER_PROGRESS_STAGE_ORDER,
  WORK_ORDER_PROGRESS_STAGE_OPTIONS,
  WORK_ORDER_PROGRESS_STAGE_LABELS,
} from '@/lib/workOrderStatus'

describe('work order progress stage order', () => {
  it('is inspect, then wait for parts, then repair', () => {
    expect(WORK_ORDER_PROGRESS_STAGE_ORDER).toEqual(['INSPECTING', 'WAITING_PARTS', 'REPAIRING'])
  })

  it('lists WAITING_PARTS before REPAIRING in the mechanic dropdown', () => {
    const values = WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => o.value)
    expect(values.indexOf('WAITING_PARTS')).toBeLessThan(values.indexOf('REPAIRING'))
  })

  it('covers every stage exactly once, with its Spanish label', () => {
    expect(WORK_ORDER_PROGRESS_STAGE_OPTIONS).toHaveLength(
      Object.keys(WORK_ORDER_PROGRESS_STAGE_LABELS).length
    )
    expect(WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => o.label)).toEqual([
      'Inspección',
      'Esperando repuestos',
      'Reparando',
    ])
  })
})
```

In `__tests__/app/owner/DashboardContent.test.ts`, extend line 1 to:

```ts
import { TIMELINE_STEPS, timelineCurrentStep, timelineStepState } from '@/app/(dashboard)/owner/DashboardContent'
```

Replace the two existing stage tests (lines 16-22) — the indices are swapping, so these must be updated, not added to:

```ts
  it('returns 2 for IN_PROGRESS + WAITING_PARTS', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'WAITING_PARTS')).toBe(2)
  })

  it('returns 3 for IN_PROGRESS + REPAIRING', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'REPAIRING')).toBe(3)
  })
```

And append this block at the end of the file:

```ts
describe('TIMELINE_STEPS', () => {
  it('runs Recibido, Inspección, Esperando repuestos, Reparando, Listo', () => {
    expect(TIMELINE_STEPS).toEqual([
      'Recibido',
      'Inspección',
      'Esperando repuestos',
      'Reparando',
      'Listo',
    ])
  })

  it('labels each in-progress stage with its own step', () => {
    expect(TIMELINE_STEPS[timelineCurrentStep('IN_PROGRESS', 'WAITING_PARTS')]).toBe('Esperando repuestos')
    expect(TIMELINE_STEPS[timelineCurrentStep('IN_PROGRESS', 'REPAIRING')]).toBe('Reparando')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test __tests__/lib/workOrderStatus.test.ts __tests__/app/owner/DashboardContent.test.ts`
Expected: FAIL — `WORK_ORDER_PROGRESS_STAGE_ORDER` and `TIMELINE_STEPS` are not exported, and `timelineCurrentStep('IN_PROGRESS', 'WAITING_PARTS')` still returns 3.

- [ ] **Step 3: Make the order explicit in `lib/workOrderStatus.ts`**

Replace the labels/options block (lines 15-24) with:

```ts
export const WORK_ORDER_PROGRESS_STAGE_LABELS: Record<WorkOrderProgressStage, string> = {
  INSPECTING: 'Inspección',
  WAITING_PARTS: 'Esperando repuestos',
  REPAIRING: 'Reparando',
}

// The workflow order shown to users: inspect the vehicle, wait for the parts, then do
// the work. The mechanic's stage dropdown and the owner timeline both read this, so the
// order lives here only — not in schema.prisma's enum declaration, and not duplicated
// in the timeline.
export const WORK_ORDER_PROGRESS_STAGE_ORDER: WorkOrderProgressStage[] = [
  'INSPECTING',
  'WAITING_PARTS',
  'REPAIRING',
]

export const WORK_ORDER_PROGRESS_STAGE_OPTIONS = WORK_ORDER_PROGRESS_STAGE_ORDER.map(value => ({
  value,
  label: WORK_ORDER_PROGRESS_STAGE_LABELS[value],
}))
```

(Reordering the keys of the `Record` is cosmetic — it keeps the file readable in workflow order. `WORK_ORDER_PROGRESS_STAGE_ORDER` is what actually decides.)

`TicketCard.tsx` already maps over `WORK_ORDER_PROGRESS_STAGE_OPTIONS`, so its dropdown picks the new order up with no change.

- [ ] **Step 4: Derive the owner timeline from the same order**

In `app/(dashboard)/owner/DashboardContent.tsx`, add to the imports:

```tsx
import {
  WORK_ORDER_PROGRESS_STAGE_ORDER,
  WORK_ORDER_PROGRESS_STAGE_LABELS,
} from '@/lib/workOrderStatus'
```

Then replace `TIMELINE_STEPS` and `timelineCurrentStep` (lines 49-62) with:

```tsx
// Bookends around the in-progress stages: PENDING is "Recibido", COMPLETED is "Listo".
export const TIMELINE_STEPS = [
  'Recibido',
  ...WORK_ORDER_PROGRESS_STAGE_ORDER.map(stage => WORK_ORDER_PROGRESS_STAGE_LABELS[stage]),
  'Listo',
]

export function timelineCurrentStep(
  status: ActiveRepairSummary['status'],
  progressStage: ActiveRepairSummary['progressStage']
): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') {
    const stageIndex = progressStage ? WORK_ORDER_PROGRESS_STAGE_ORDER.indexOf(progressStage) : -1
    // No stage set yet (or an unknown one) reads as the first in-progress step.
    return stageIndex === -1 ? 1 : stageIndex + 1
  }
  return TIMELINE_STEPS.length - 1
}
```

The `as const` is gone on purpose: the spread produces a `string[]`, and nothing depends on literal types. Every other use in the file (`TIMELINE_STEPS.length`, `TIMELINE_STEPS.map`) is unaffected.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test __tests__/lib/workOrderStatus.test.ts __tests__/app/owner/DashboardContent.test.ts`
Expected: PASS — including the untouched `PENDING → 0`, `IN_PROGRESS + null → 1`, `COMPLETED → 4` and `timelineStepState` cases.

- [ ] **Step 6: Lint and type-check**

Run: `pnpm lint && pnpm build`
Expected: no errors.

- [ ] **Step 7: Manual verification**

With `pnpm dev` running: as a mechanic, set a ticket to "En progreso" — the stage dropdown reads Inspección / Esperando repuestos / Reparando in that order. Pick "Esperando repuestos", then open the owner dashboard for that vehicle.
Expected: the timeline reads `Recibido → Inspección → Esperando repuestos → Reparando → Listo`, with the pulse on the 3rd step and "Reparando" still ahead of it (not checked off).

- [ ] **Step 8: Commit**

```bash
git add lib/workOrderStatus.ts __tests__/lib/workOrderStatus.test.ts "app/(dashboard)/owner/DashboardContent.tsx" __tests__/app/owner/DashboardContent.test.ts
git commit -m "fix: order service stages as inspect, wait for parts, then repair"
```

---

### Task 7: Full verification, SonarQube pass, and PR

**Files:** none modified unless the checks below surface something.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a PR against `dev`.

- [ ] **Step 1: Run lint, the full suite with coverage, and a production build**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: no lint errors; every Jest test passes; `coverage/lcov.info` is regenerated; the build completes.

- [ ] **Step 2: Manual QA against a running app**

Run: `docker compose up -d db` then `pnpm dev` (do not run the app container at the same time — both bind port 3000). Work through this list:

1. As an owner, book two turnos for the **same** vehicle at one workshop.
2. As a mechanic at that workshop, open `/mechanic/board`: both turnos appear under "Programado".
3. Press "Registrar llegada" on the first → a ticket appears in "Pendiente" **and the second turno disappears** from "Programado". The vehicle is on the board exactly once.
4. Drag the ticket to "Completado" → the card stays (closed less than 24h ago).
5. In `npx prisma studio`, set that work order's `closedAt` to two days ago and reload the board → the card is gone, and the second turno is back in "Programado".
6. Press "Registrar llegada" on it → succeeds (nothing open for that vehicle anymore).
7. Open `/mechanic/settings` with a saved address → no dropdown on load; type → suggestions; pick → list closes and stays closed.
8. Register a new mechanic → `/workshop/setup` → the Dirección field offers Google suggestions; submitting without picking shows the Spanish hint; picking one creates the workshop with coordinates (verify in Prisma Studio).
9. Set the ticket to "En progreso": the stage dropdown reads Inspección / Esperando repuestos / Reparando. Pick "Esperando repuestos" and check the owner dashboard for that vehicle: the timeline reads `Recibido → Inspección → Esperando repuestos → Reparando → Listo` with the pulse on the 3rd step; switching the mechanic to "Reparando" moves the pulse one step right.

- [ ] **Step 3: SonarQube review (required by CLAUDE.md before a PR)**

Use the `sonarqube:sonarqube-reviewer` agent against the branch diff. Fix any new Critical/Blocker issue or quality-gate failure before continuing; `sonarqube:sonar-fix-issue` handles rule-specific ones.

- [ ] **Step 4: Branch and open the PR**

Note `main` holds only the initial commit — all work lands on `dev`, so the PR targets `dev`.

```bash
git checkout -b fix/board-duplicates-and-location-input
git push -u origin fix/board-duplicates-and-location-input
gh pr create --base dev --title "fix: board duplicates, address input, and stage order" --body "$(cat <<'EOF'
## Summary

- Reject check-in when the vehicle already has an open work order at the workshop, so the same vehicle cannot be received twice
- Board now shows open tickets plus anything closed in the last 24h (same grace period the owner dashboard uses), instead of every ticket the workshop ever created
- "Programado" hides turnos whose vehicle is already in service, so a vehicle appears exactly once on the board
- Google Places suggestions no longer pop open over an address that is already set (on mount and right after picking a suggestion)
- Workshop setup wizard uses the Places input and stores latitude/longitude/googlePlaceId, so a new workshop is searchable by distance immediately
- Service stages now follow the real workflow — Recibido → Inspección → Esperando repuestos → Reparando → Listo — with the order defined once in `lib/workOrderStatus.ts` and read by both the mechanic's dropdown and the owner timeline

## Test plan

- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Two turnos for one vehicle: first check-in succeeds, second turno disappears, vehicle shows once on the board
- [ ] Ticket closed more than 24h ago drops off the board
- [ ] `/mechanic/settings` opens with the saved address and no suggestion dropdown
- [ ] New mechanic completes `/workshop/setup` with a Places address and the workshop gets coordinates
- [ ] Mechanic stage dropdown and owner timeline both read Inspección → Esperando repuestos → Reparando
- [ ] SonarQube quality gate passes with no new Critical/Blocker issues

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Notes on deliberate scope limits

- **The race is not closed at the database level.** Two simultaneous check-ins of two different turnos for the same vehicle could still slip past the `findFirst` guard. Postgres could enforce it with a partial unique index (`... ON "WorkOrder"("vehicleId") WHERE status IN ('PENDING','IN_PROGRESS')`), but Prisma cannot express partial indexes in `schema.prisma`, so the index would show up as schema drift on every `prisma migrate dev`. Add it as a hand-written migration only if double check-ins actually appear in production.
- **Nothing stops an owner from booking two turnos for the same vehicle.** The board no longer shows both, which is what was asked. Blocking the second booking belongs in `POST /api/appointments` and is a separate decision.
- **The owner's personal address field** (`/owner/profile`) stays a plain text input — it is not geocoded and not used for search.
