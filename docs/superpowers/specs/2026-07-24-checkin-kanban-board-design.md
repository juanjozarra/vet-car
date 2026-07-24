# Vehicle Check-In & Kanban Ticket Board — Design Spec

**Date:** 2026-07-24
**Status:** Approved

## Overview

Today, the instant an owner books an appointment it's fully workable — a mechanic can log history against it before the car has physically arrived. This spec closes that gap and, in the same pass, gives the dormant `WorkOrder` model its first UI: a Jira-style board where "checking in" a scheduled appointment creates a ticket, and mechanics move tickets through `PENDING → IN_PROGRESS → COMPLETED/CANCELLED` with a status selector.

This is spec 2 of 2 for the mechanic/workshop feature area (spec 1, workshop staff management — ADMIN/STAFF roles and invites — is implemented and stacked underneath this branch). The board's mechanic-reassignment picker consumes spec 1's roster.

---

## 1. Data Model

### Schema Changes vs. Current

| Entity | Change |
|---|---|
| `WorkOrder` | Add `appointmentId String? @unique` + `appointment Appointment?` relation |
| `Appointment` | Add `workOrder WorkOrder?` back-relation |

```prisma
model WorkOrder {
  // ...existing fields unchanged...
  appointmentId String? @unique

  // ...existing relations...
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
}

model Appointment {
  // ...existing fields unchanged...

  // ...existing relations...
  workOrder WorkOrder?
}
```

No new enums. `WorkOrderStatus` (`PENDING | IN_PROGRESS | COMPLETED | CANCELLED`) already maps 1:1 to the board's ticket columns, and no new `AppointmentStatus` value is needed.

### Key Design Decisions

- **Check-in creates a `WorkOrder` from an `Appointment`; it does not add a new appointment status.** The appointment's job (getting the car in the door, booked into a slot) is done once a `WorkOrder` exists for it. The `appointmentId` FK is what marks an appointment as "consumed" into a ticket.
- **The board's "Programado" column is computed, not stored**: appointments with `status: SCHEDULED` and `workOrder: null`. Once checked in, an appointment naturally drops out of that column because it now has a linked ticket — no extra state to keep in sync.
- **`WorkOrder.mechanicId` stays required.** Check-in assigns the ticket to whichever mechanic performs the check-in, so a ticket is never assignee-less. This avoids a schema nullability change and every downstream assumption that would ripple from it.
- **Appointment status syncs from its linked ticket.** When a `WorkOrder` reaches `COMPLETED` or `CANCELLED`, its linked `Appointment` (if any) is updated to match — keeps the owner-facing schedule view (`/owner/schedule`) accurate without any owner-side changes.
- **Any workshop mechanic (ADMIN or STAFF) can check in appointments, and can view/update/reassign any ticket** — not just the assignee. Matches the existing workshop-scoped (not per-mechanic) access model already used by `lib/vehicleAccess.ts`.
- **No time-window or pagination on the board's columns in this pass.** All of a workshop's tickets render, including old `COMPLETED`/`CANCELLED` ones. Flagged as a future concern if a shop's history grows large enough to matter — not addressed now (YAGNI).

---

## 2. API & Access Rules

### Access rule

A mechanic can act on a `WorkOrder` (view/update status/reassign) or check in an `Appointment` if the target belongs to their own workshop: `workOrder.mechanic.workshopId === session.user.workshopId`, or for an appointment, `appointment.workshopId === session.user.workshopId`. This is workshop-scoped, matching every other mechanic-facing access rule in this app — no additional per-mechanic restriction.

### Routes

| Route | Method | Behavior |
|---|---|---|
| `/api/appointments/[id]/check-in` | POST | Caller must be a `MECHANIC` with `workshopId`. `401` if unauthenticated, `403` if not a workshop mechanic. `404` if the appointment doesn't belong to the caller's workshop. `409` if `status !== 'SCHEDULED'` or the appointment already has a `workOrder`. On success, creates a `WorkOrder`: `title = appointment.title`, `description = appointment.notes`, `mechanicId = session.user.id`, `vehicleId = appointment.vehicleId`, `appointmentId = appointment.id`, `status: 'PENDING'`. Returns `201` with the created ticket. |
| `/api/workorders/[id]` | PATCH | Body: `{ status?, mechanicId?, title?, description? }` — all optional, only provided fields are updated. `401`/`403` per the access rule above (`404` if the ticket isn't in the caller's workshop). If `mechanicId` is provided, it must belong to a mechanic in the same workshop (`400` otherwise). Status-change side effects run through the `ON_STATUS_CHANGE` table (see §4) inside a `prisma.$transaction`. Returns `200` with the updated ticket. |

### Board read

`/mechanic/board` (the page itself) queries Prisma directly from the Server Component, following this codebase's established convention (no page fetches its own API for a read — see the `2026-07-14-vehicle-service-history-design.md` precedent). It fetches:
1. `SCHEDULED` appointments for the workshop with `workOrder: null` (→ Programado column).
2. All `WorkOrder`s where `mechanic.workshopId` matches the caller's workshop, grouped client-side into the four status columns.

---

## 3. Status-Change Side Effects

Rather than a full State-pattern class hierarchy (rejected — see reasoning below), status-change side effects are a small lookup table, since only 2 of the 4 statuses have any side effect at all:

```ts
// lib/workOrderStatusEffects.ts
type StatusEffect = (tx: PrismaTransactionClient, workOrder: WorkOrder) => Promise<void>

const ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, StatusEffect>> = {
  COMPLETED: async (tx, workOrder) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({ where: { id: workOrder.appointmentId }, data: { status: 'COMPLETED' } })
    }
    const existing = await tx.historyEntry.findFirst({ where: { workOrderId: workOrder.id } })
    if (!existing) {
      const mechanic = await tx.user.findUnique({ where: { id: workOrder.mechanicId }, select: { workshopId: true } })
      await tx.historyEntry.create({
        data: {
          vehicleId: workOrder.vehicleId,
          type: 'OTHER',
          description: workOrder.description ? `${workOrder.title} — ${workOrder.description}` : workOrder.title,
          performedAt: new Date(),
          source: 'MECHANIC',
          createdById: workOrder.mechanicId,
          workshopId: mechanic!.workshopId,
          workOrderId: workOrder.id,
        },
      })
    }
  },
  CANCELLED: async (tx, workOrder) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({ where: { id: workOrder.appointmentId }, data: { status: 'CANCELLED' } })
    }
  },
}
```

`PENDING` and `IN_PROGRESS` have no entry — the PATCH route just updates the row.

**Why not the State pattern:** all four statuses accept the same operations (a single PATCH), and only two have any side effect — this is two conditional branches, not a family of state-specific behaviors across multiple operations. A `WorkOrderState` interface with four concrete classes would be the first class-based domain abstraction in a codebase that's plain functions + Prisma everywhere else, for a problem this table already solves. If a third status later grows real per-state behavior, promoting this table to a proper State pattern is a small, contained refactor.

**Idempotency:** the `historyEntry.findFirst` check means cycling a ticket `COMPLETED → IN_PROGRESS → COMPLETED` never double-logs — this is exactly the mechanism the `2026-07-14-vehicle-service-history-design.md` spec reserved `HistoryEntry.workOrderId` for.

---

## 4. UI & Navigation

### `/mechanic/board` (new page, new "Tablero" nav item)

Nav order becomes: Panel / **Tablero** / Vehículos / Equipo / Configuración — positioned right after Panel since this becomes the primary daily-use surface.

Five columns, each a `bezel` card list matching the visual language already used for lists elsewhere (roster, pending invites):

**Programado** (computed appointments, §1) — each card shows scheduled time, vehicle (nickname or make/model/plate), owner name, and a "Registrar llegada" button → `POST /api/appointments/[id]/check-in`, then `router.refresh()`.

**Pendiente · En progreso · Completado · Cancelado** (`WorkOrder`s grouped by status) — each card shows vehicle, ticket title, assigned mechanic (avatar + initials, reusing the roster's pattern), and a status `Select` (all 4 `WorkOrderStatus` values, current one selected; changing it fires `PATCH /api/workorders/[id]`, then `router.refresh()`).

**Card click** (tickets only, not appointment cards) opens a `Dialog`:
- Title and description, editable, saved via the same `PATCH /api/workorders/[id]` route.
- A mechanic-reassign `Select`, populated from `GET /api/workshop/team` (built in spec 1).
- A link to the vehicle's detail page (`/mechanic/vehicles/[id]`).

### `MechanicPanel` update

The existing "Órdenes de trabajo — Próximamente" card (`app/(dashboard)/mechanic/MechanicPanel.tsx`) drops its "Próximamente" badge, shows a live count of non-terminal tickets (`PENDING + IN_PROGRESS`) for the workshop, and links to `/mechanic/board`. This is exactly what that placeholder card was reserved for.

---

## 5. Testing

Following this repo's established convention (API/lib tests only — no component-testing setup, matching every prior spec in this codebase):

- `__tests__/api/appointments-checkin.test.ts` — 401/403/404 auth and workshop-scoping, 409 for an already-`SCHEDULED`-but-`workOrder`-linked or non-`SCHEDULED` appointment, happy path asserting the created `WorkOrder`'s fields are correctly derived from the appointment.
- `__tests__/api/workorders.test.ts` — 401/403/404 auth and workshop-scoping (including a mechanic from a *different* workshop getting rejected), 400 for reassigning to a mechanic outside the workshop, status→`COMPLETED` triggers both the appointment sync and the history entry (mocked `$transaction`), re-completing an already-completed ticket doesn't duplicate the history entry, status→`CANCELLED` syncs the appointment but does not touch history.
- `__tests__/lib/workOrderStatusEffects.test.ts` — each entry in `ON_STATUS_CHANGE` tested in isolation against a mocked transaction client; confirms `PENDING`/`IN_PROGRESS` have no entry in the table.

---

## Out of Scope (this pass)

- `ServiceItem` (parts/labor line item) management on a ticket — ticket detail stays to title/description/status/assignee. A natural follow-up spec once the board itself is in use.
- Drag-and-drop card movement — status changes go through a `Select`/buttons on the card, avoiding a new drag-and-drop dependency.
- Pagination or time-windowing of board columns.
- Walk-in check-in (a vehicle arriving with no prior appointment) — this spec only gates *scheduled* appointments behind check-in, per the original request's scope.
- A dedicated ticket detail page — the dialog covers this pass's editing needs; promoting to a full page is a small, contained follow-up if `ServiceItem`s are added later.
