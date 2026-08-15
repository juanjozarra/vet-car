# Walk-In Work Orders — Design Spec

**Date:** 2026-08-14
**Status:** Approved

## Overview

Today the only code path that creates a `WorkOrder` is `POST /api/appointments/[id]/check-in`. A `WorkOrder` therefore requires an `Appointment`, which requires a `Vehicle`, which requires a registered `OWNER` who booked a slot. A customer who drives up without a booking — the ordinary case in a repair shop — **cannot be served by this product at all**.

This spec adds:
- Direct work-order creation from the mechanic board, with no appointment involved.
- The ability to record a vehicle the shop has never seen, whose owner has no account.
- An owner-side claim flow, so a car the workshop entered eventually reaches its real owner with its service history intact.

It does not touch `ServiceItem`, appointment cancellation, or the status-transition rules — those are separate gaps noted in the 2026-08-14 code review.

---

## 1. Data Model

### Schema Changes vs. Current

| Entity | Change |
|---|---|
| `Vehicle` | `ownerId String` → `ownerId String?` |
| `Vehicle` | `owner User @relation("VehicleOwner", …)` → `owner User? @relation("VehicleOwner", …)` |

```prisma
model Vehicle {
  // …unchanged fields…
  ownerId    String?

  owner        User?         @relation("VehicleOwner", fields: [ownerId], references: [id])
  // …unchanged relations…
}
```

Migration is one statement:

```sql
ALTER TABLE "Vehicle" ALTER COLUMN "ownerId" DROP NOT NULL;
```

No new model, no new enum, no new index. `vin String? @unique` already exists and becomes the claim key.

### Key Design Decisions

- **A walk-in vehicle is an ownerless vehicle, not a placeholder account.** The alternative — minting a stub `User` per walk-in — would fill the user table with synthetic rows against a unique email index and turn claiming into an account merge. A nullable FK is both the smaller change and the more honest model: nobody owns this record yet.

- **Unowned vehicles are invisible to owners by construction.** Every owner-scoped read already filters on `ownerId`, and SQL `NULL` matches no equality predicate. `activeRepairsWhere` (`vehicle: { ownerId }`), the owner dashboard and schedule queries (`where: { ownerId: userId }`), the `OWNER` branch of `canAccessVehicleHistory` (`vehicle?.ownerId === user.id`), and the booking guard in `POST /api/appointments` (`vehicle.ownerId !== session.user.id`) are all correct with zero changes. This is the main reason to prefer the nullable column: the safe behaviour is the default, not something each call site has to remember.

- **Exactly two call sites break, and both are display-only.** `app/(dashboard)/mechanic/vehicles/page.tsx:27` and `app/(dashboard)/mechanic/board/page.tsx:71` read `owner.name` through a now-nullable relation. Both get `?? 'Sin dueño'` / `?? 'Sin nombre'`. `tsc --noEmit` finds them; there are no others.

- **Claiming requires a VIN, never a plate.** A plate is visible from the street, so accepting one would let anyone claim any car and read its full service history. A VIN is 17 characters, printed on the registration document and the dashboard, and is already `@unique` — it is the only identifier in this schema suitable for a trust boundary. A walk-in recorded without a VIN cannot be self-claimed; that is a deliberate limitation, not an oversight.

- **A VIN that already belongs to a registered owner is refused, not attached.** If mechanics could open a ticket against any existing vehicle by typing its VIN, a plate-or-VIN lookup would become a cross-workshop history leak. So: VIN matches an **unowned** vehicle → reuse that record (the shop has seen this car before); VIN matches an **owned** vehicle → `409`, with copy telling the mechanic to have the customer book a turno. The registered-owner-walks-in case needs a consent step and is out of scope here.

- **The "already in service" guard is reused verbatim.** `POST /api/workorders` runs the same open-ticket check as check-in (`OPEN_WORK_ORDER_STATUSES`, scoped to this workshop), so a walk-in cannot produce the duplicate-vehicle-on-the-board bug that PR #13 just fixed.

- **Vehicle field validation is extracted, not duplicated.** `POST /api/vehicles` currently parses `year`/`mileage` inline with unguarded `parseInt`. That logic moves into `lib/vehicleInput.ts` with proper NaN handling, and both the owner route and the new mechanic route call it — which also closes the `year: "abc"` → 500 finding from the code review.

---

## 2. API & Access Rules

### Access rule

A `MECHANIC` with a `workshopId` may create a work order. The resulting `WorkOrder.mechanicId` is the caller, and `appointmentId` is `null` — that null is what distinguishes a walk-in from a checked-in appointment, and no new column is needed to record it.

### Routes

| Route | Method | Behavior |
|---|---|---|
| `/api/workorders` | POST | **New.** `MECHANIC` + `workshopId` required, else `403`. Body is `{ vehicleId, title, description? }` **or** `{ vehicle: {…}, title, description? }` — exactly one of `vehicleId` / `vehicle`, else `400`. With `vehicleId`: the vehicle must already be linked to this workshop (`canAccessVehicleHistory`), else `404`. With `vehicle`: validated via `lib/vehicleInput.ts`; a VIN matching an unowned vehicle reuses it, a VIN matching an owned vehicle returns `409`. Returns `409` if the target vehicle already has an open work order at this workshop. Creates the vehicle (when new) and the `WorkOrder` in one transaction, status `PENDING`. `201` with the work order. |
| `/api/vehicles/claim` | POST | **New.** `OWNER` only, else `403`. Body `{ vin }`. `400` if `vin` is missing or not a string. `404` if no vehicle carries that VIN — the same response as "already owned", so the endpoint cannot be used to probe which VINs exist. Otherwise sets `ownerId` to the caller and returns the vehicle. |

`POST /api/vehicles` (existing) keeps its behavior and contract; only its internal parsing moves to the shared helper.

### Why `409` and `404` are shaped this way

`/api/vehicles/claim` deliberately returns `404` for both "no such VIN" and "that VIN is already claimed". Distinguishing them would confirm to an attacker that a given VIN is in the system, which is exactly the enumeration this endpoint must not enable.

---

## 3. UI & Navigation

### `/mechanic/board` — "Recibir vehículo"

A primary button in the board header, beside the page title, opens a dialog with two tabs:

- **"Ya registrado"** — a search field over the vehicles already linked to this workshop (the list `getWorkshopVehicles` already returns), filtered by plate, VIN or label. Picking one plus a ticket title submits `{ vehicleId, title, description }`.
- **"Vehículo nuevo"** — the same field set the owner's `NewVehicleForm` uses (make, model, year, plate, plateState, VIN, mileage, nickname), plus the ticket title and description. Submits `{ vehicle: {…}, title, description }`.

On success the dialog closes and `router.refresh()` puts the new ticket in the "Pendiente" column. Errors render through the existing `FormErrorBanner`. Reuse `components/ui/dialog.tsx` and the board's existing card and select primitives — this introduces no new UI components.

### `/owner/vehicles/new` — claiming

Below the existing registration form, a secondary section: **"¿Un taller ya cargó tu vehículo?"** with a single VIN input and a "Reclamar" button. Success routes to that vehicle's detail page, where its full history — everything the workshop logged while the car was unowned — is already visible through the existing timeline. Failure shows one Spanish message covering both `404` cases: "No encontramos un vehículo sin dueño con ese VIN."

### Display fallbacks

`mechanic/vehicles/page.tsx` shows `'Sin dueño'` where an owner name would go; the board's appointment cards keep `'Sin nombre'` (appointments always originate from an owner booking, so this branch is defensive only).

---

## 4. Testing

Jest is node-environment only — no jsdom, no React Testing Library. Cover behavior through route handlers and pure functions, following the existing suite:

- `__tests__/lib/vehicleInput.test.ts` (new) — the extracted parser: valid input, `year: "abc"` rejected, `year: ""` rejected, non-numeric `mileage` rejected, optional fields normalized to `null`.
- `__tests__/api/workorders-create.test.ts` (new) — `403` for owners and for mechanics with no workshop; `400` when both `vehicleId` and `vehicle` are sent, and when neither is; `404` for a `vehicleId` outside the workshop; `409` when the vehicle already has an open ticket; `409` when the VIN belongs to an owned vehicle; reuse of an existing unowned vehicle on VIN match; `201` creating vehicle and work order together.
- `__tests__/api/vehicles-claim.test.ts` (new) — `403` for mechanics; `400` for a missing VIN; `404` for an unknown VIN **and** for an already-owned one; success sets `ownerId`.
- `__tests__/lib/vehicleAccess.test.ts` (modify) — add a case proving an unowned vehicle is not accessible to an arbitrary owner (`ownerId: null` vs. a session id).

Assert whole `where()` objects rather than casting to `any`, per commit `5ddfdbf`.

---

## Out of Scope (this pass)

- **A registered owner walking in.** Needs a consent handshake — the owner approving that this workshop may open a ticket on their car — rather than a VIN lookup that would leak history across workshops.
- **Claiming a vehicle that has no VIN.** Would require the workshop to vouch for the link; no mechanism for that exists yet.
- **Merging a claimed walk-in with a vehicle the owner had already registered separately.** Two records for one car is possible if the owner registered it without a VIN. Detecting and merging is its own problem.
- **Notifying an owner that a workshop created a vehicle for them.** There is no address to notify — that is the entire premise of a walk-in.
- **`ServiceItem` creation, appointment cancellation, work-order status transition rules.** Separate gaps from the same review; each needs its own spec.
