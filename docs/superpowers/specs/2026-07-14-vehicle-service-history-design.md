# Vehicle Service History — Design Spec

**Date:** 2026-07-14
**Status:** Approved

## Overview

A vehicle's service history is a manually-logged timeline of maintenance, repairs, and upgrades performed on it — distinct from `WorkOrder` (the mechanic's estimate-approval-completion workflow, which has no UI yet). Both car owners and mechanics can log entries directly, without going through a work order. There is no verification mechanism for owner-logged entries; instead, every entry is visibly tagged with who logged it, so viewers can judge credibility themselves.

This spec covers only the history feature. It does not add WorkOrder create/complete UI; it prepares a nullable link (`workOrderId`) so a future WorkOrder-completion flow can auto-populate history entries without a schema change.

---

## 1. Data Model

### Schema Changes vs. Current

| Entity | Change |
|---|---|
| `HistoryEntry` | **New** — see below |
| `HistorySource` | **New enum** — `OWNER \| MECHANIC` |
| `Vehicle` | Add `historyEntries HistoryEntry[]` |
| `User` | Add `historyEntries HistoryEntry[] @relation("HistoryEntryAuthor")` |
| `Workshop` | Add `historyEntries HistoryEntry[]` |
| `WorkOrder` | Add `historyEntries HistoryEntry[]` |

```prisma
enum HistorySource {
  OWNER
  MECHANIC
}

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

### Key Design Decisions

- **Reuses `ServiceItemType`** (REPAIR / MAINTENANCE / UPGRADE / OTHER) rather than a new taxonomy — same categories as `ServiceItem`, no additional list to build or maintain.
- **No verification workflow.** Trust is handled by transparency, not gatekeeping: every entry stores `source` and (when `MECHANIC`) `workshopId`, so the UI can always render "Reportado por el dueño" or "Registrado por {workshop.name}" (plus `createdBy.name`).
- **`workOrderId` is nullable and unused by any code path in this pass.** It exists so a future WorkOrder-completion flow can stamp it on auto-generated entries and check "has this WorkOrder already been synced" before creating duplicates, without a later migration. No sync function ships as part of this spec.
- **`odometerReading`, `cost`, `photoUrl` are all optional.** A quick log (e.g. "cambié el filtro de aire") shouldn't require a receipt or exact mileage.
- **Author-only mutation.** No role-based edit/delete rules beyond "the creator can edit or delete their own entry" — simplest permission model, and matches how the trust badge already exposes who's responsible for what.
- **One photo per entry**, stored as a real file (see §3), not inline in the row.

---

## 2. Access Rules & API

### Access check

A single shared helper decides read/write access to a vehicle's history — used by every route below so the rule can't drift between endpoints:

```ts
// lib/vehicleAccess.ts
async function canAccessVehicleHistory(userId: string, role: Role, vehicleId: string): Promise<boolean>
```

- **OWNER**: `true` only if `vehicle.ownerId === userId`.
- **MECHANIC**: `true` if the vehicle has any `Appointment.workshopId` **or** any `WorkOrder` whose `mechanic.workshopId` equals the mechanic's own `workshopId`. This is workshop-scoped, not per-mechanic — any mechanic at a workshop that has ever served the car can view and log its history. A mechanic cannot look up an arbitrary stranger's vehicle.

Edit/delete uses a separate, simpler check: `entry.createdById === session.user.id`.

### Routes

| Route | Method | Behavior |
|---|---|---|
| `/api/vehicles/[id]` | GET | Vehicle detail + `historyEntries` ordered by `performedAt` desc. 403 if `canAccessVehicleHistory` fails. |
| `/api/vehicles/[id]/history` | POST | Create an entry. `source` and `workshopId` are derived server-side from the session — never trusted from the request body. 403 if no access. |
| `/api/history/[id]` | PATCH | Edit an entry. 403 unless `createdById` matches the session user. |
| `/api/history/[id]` | DELETE | Delete an entry. 403 unless `createdById` matches the session user. |
| `/api/history/upload` | POST | Vercel Blob client-upload token handler (`handleUpload` from `@vercel/blob/client`). Validates the caller is authenticated and restricts uploads to image content types before issuing a token. |

### Photo storage

Uses `@vercel/blob` (public access), added as a new dependency. The browser uploads the photo directly to Blob via the client-upload flow (`upload()` + `handleUploadUrl` pointed at `/api/history/upload`); the resulting URL is what gets submitted as `photoUrl` on the entry. No image bytes pass through the app server. Requires provisioning a Blob store and `BLOB_READ_WRITE_TOKEN` (via `vercel env pull` once linked).

---

## 3. UI & Navigation

### Shared component

`VehicleHistoryTimeline` (client component) renders the reverse-chronological list of entries: type icon, description, date, optional mileage/cost/photo thumbnail, and the source badge. Edit/delete controls render only when the viewing user is the entry's author. Used by both the owner and mechanic pages below so the timeline never diverges between roles.

### Owner side

- **`/owner/vehicles/[id]`** (new) — vehicle header (make/model/year/plate/photo) + `VehicleHistoryTimeline` + "Agregar registro" button.
- `VehicleCard` in `DashboardContent.tsx` currently has no `onClick` — it becomes a link into this page, same pattern already used for `AppointmentRow` → `/owner/schedule`.
- **`/owner/vehicles/[id]/history/new`** (new) — entry form: type select, description textarea, `performedAt` via the existing date-picker, optional odometer/cost number inputs, optional single-photo upload. A full page, matching the existing `NewVehicleForm` convention rather than a dialog.

### Mechanic side

- **`/mechanic/vehicles`** (new) — list of vehicles linked to the mechanic's workshop (same access rule as §2, queried in reverse), with a client-side filter input over plate/VIN/owner name. Added to `MECHANIC_NAV_ITEMS`.
- **`/mechanic/vehicles/[id]`** (new) — same header + `VehicleHistoryTimeline`, plus "Agregar registro" scoped to that vehicle.
- **`/mechanic/vehicles/[id]/history/new`** (new) — same form as the owner's; submitted entries get `source: MECHANIC` and `workshopId` set server-side.

This is what the mechanic dashboard's existing "Órdenes de trabajo — Próximamente" card gestures at, without touching `WorkOrder` itself.

---

## Out of Scope (this pass)

- WorkOrder create/complete UI and API.
- Auto-generating `HistoryEntry` rows from completed WorkOrders (the `workOrderId` field is reserved for this, unused for now).
- Multiple photos per entry.
- Any verification/moderation mechanism for owner-logged entries.
