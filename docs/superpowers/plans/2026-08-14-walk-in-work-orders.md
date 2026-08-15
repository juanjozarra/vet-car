# Walk-In Work Orders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-08-14-walk-in-work-orders-design.md`

**Goal:** A mechanic can receive a vehicle that has no appointment — including a car nobody has registered — and the real owner can later claim it by VIN and see everything the workshop logged.

**Architecture:** `Vehicle.ownerId` becomes nullable, which makes "a vehicle nobody owns" representable without a placeholder account and leaves every owner-scoped query correct as written. Vehicle field parsing moves out of `POST /api/vehicles` into `lib/vehicleInput.ts` so the new mechanic-side route shares one validator (and gains the NaN guards the owner route never had). A new `POST /api/workorders` creates the ticket — attaching to a workshop vehicle by id, or creating the vehicle in the same transaction — reusing the open-ticket guard from check-in. A new `POST /api/vehicles/claim` links an unowned vehicle to an owner by VIN. The board grows a "Recibir vehículo" dialog; `/owner/vehicles/new` grows a claim section.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma v7, NextAuth v4, Jest (node env), Tailwind v4, pnpm.

## Global Constraints

- **No new dependencies.** Dialog, select, input, and error-banner primitives all exist.
- **One database migration**, in Task 1. It is a single `DROP NOT NULL` — no data is rewritten.
- **Language split (CLAUDE.md):** all user-facing copy in Latin-American Spanish; all commits, comments, test names, identifiers and this doc in English.
- **Package manager is pnpm** — `pnpm test`, `pnpm lint`, `pnpm build`. Never `npm run`.
- **Next.js 16 is not the Next.js you know (AGENTS.md):** read the relevant guide under `node_modules/next/dist/docs/` before touching routing or server-component APIs. Route handlers here take `{ params }: { params: Promise<{ id: string }> }` — keep that shape.
- **Prisma v7:** the client is adapter-based via `lib/prisma.ts`; the datasource URL lives in `prisma.config.ts`, not in `schema.prisma`.
- **Tests are node-environment only** (`jest.config.js` sets `testEnvironment: 'node'`). There is no jsdom or React Testing Library — do not add one. Component behavior is covered by exported pure functions or by the manual QA checklist in Task 7.
- **Commit after every task**, English `type: subject` messages matching the existing log.
- **Depends on:** `2026-08-14-critical-fixes-and-lint-debt.md` being merged first — Task 6 of this plan touches `app/(dashboard)/mechanic/board/`, and starting from a green `pnpm lint` is what makes the Task 7 gate meaningful.

### Verified facts (do not re-derive)

- `POST /api/appointments/[id]/check-in` is the **only** code path in the repository that creates a `WorkOrder`. `app/api/workorders/[id]/route.ts` exposes `PATCH` only; there is no collection-level route file.
- Making `ownerId` nullable breaks exactly **two** call sites, both display-only: `app/(dashboard)/mechanic/vehicles/page.tsx:27` (`v.owner.name`) and `app/(dashboard)/mechanic/board/page.tsx:71` (`a.vehicle.owner.name`). Confirm with `npx tsc --noEmit` after the migration rather than searching by hand.
- These call sites are correct **without changes** because `NULL` satisfies no equality predicate: `lib/activeRepairs.ts:21`, `lib/vehicleAccess.ts:13`, `app/(dashboard)/owner/page.tsx:20,31`, `app/(dashboard)/owner/schedule/page.tsx:18`, `app/api/appointments/route.ts:30`.
- `lib/activeRepairs.ts` exports `OPEN_WORK_ORDER_STATUSES`. Task 4 reuses it; do not write a second list of open statuses.
- The check-in handler's duplicate guard is `app/api/appointments/[id]/check-in/route.ts:31-41`. Task 4 applies the same rule; extract it if that reads cleaner, but do not change check-in's behavior.
- `Vehicle.vin` is already `String? @unique`. No index work is needed for the claim lookup.
- `POST /api/vehicles:30,33` currently calls `parseInt(year, 10)` and `parseInt(mileage, 10)` with no NaN check, so `year: "abc"` reaches Prisma and returns a 500. Task 2 fixes this as a side effect of extracting the parser — it is a code-review finding, not scope creep.
- Migrations here are timestamp-prefixed directories under `prisma/migrations/`, most recently `20260730161249_add_work_order_progress_stage`. If `prisma migrate dev` cannot run interactively in your shell, hand-write the migration directory and apply it with `prisma migrate deploy`, then confirm zero drift with `prisma migrate status` — the precedent is Task 1 of the check-in board plan.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `prisma/schema.prisma` (modify) | `Vehicle.ownerId` and `Vehicle.owner` become optional | 1 |
| `prisma/migrations/<ts>_vehicle_owner_optional/` (create) | `DROP NOT NULL` on `Vehicle.ownerId` | 1 |
| `app/(dashboard)/mechanic/vehicles/page.tsx` (modify) | `'Sin dueño'` fallback | 1 |
| `app/(dashboard)/mechanic/board/page.tsx` (modify) | Optional-chained owner name | 1 |
| `lib/vehicleInput.ts` (create) | The single vehicle-field parser, with NaN guards | 2 |
| `__tests__/lib/vehicleInput.test.ts` (create) | Pins the parser's rules | 2 |
| `app/api/vehicles/route.ts` (modify) | Calls the shared parser instead of inline `parseInt` | 2 |
| `app/api/vehicles/claim/route.ts` (create) | Owner claims an unowned vehicle by VIN | 3 |
| `__tests__/api/vehicles-claim.test.ts` (create) | Covers the claim route | 3 |
| `app/api/workorders/route.ts` (create) | Walk-in work-order creation | 4 |
| `__tests__/api/workorders-create.test.ts` (create) | Covers the new route | 4 |
| `__tests__/lib/vehicleAccess.test.ts` (modify) | Unowned vehicle is not accessible to an arbitrary owner | 4 |
| `app/(dashboard)/mechanic/board/ReceiveVehicleDialog.tsx` (create) | The "Recibir vehículo" dialog | 5 |
| `app/(dashboard)/mechanic/board/Board.tsx` (modify) | Header button that opens it | 5 |
| `app/(dashboard)/mechanic/board/page.tsx` (modify) | Feeds the dialog the workshop's vehicles | 5 |
| `app/(dashboard)/owner/vehicles/new/ClaimVehicleForm.tsx` (create) | VIN claim section | 6 |
| `app/(dashboard)/owner/vehicles/new/page.tsx` (modify) | Renders it below the registration form | 6 |

---

### Task 1: Make `Vehicle.ownerId` optional

**Files:**
- Modify: `prisma/schema.prisma:163-182`
- Create: `prisma/migrations/<timestamp>_vehicle_owner_optional/migration.sql`
- Modify: `app/(dashboard)/mechanic/vehicles/page.tsx:27`
- Modify: `app/(dashboard)/mechanic/board/page.tsx:71`

**Interfaces:**
- Consumes: nothing.
- Produces: a `Vehicle` whose `ownerId` may be null — every later task depends on this.

- [ ] **Step 1: Edit the schema**

In `model Vehicle`, change `ownerId String` to `ownerId String?` and `owner User @relation("VehicleOwner", …)` to `owner User? @relation("VehicleOwner", …)`. Leave every other field and relation untouched.

- [ ] **Step 2: Create and apply the migration**

`npx prisma migrate dev --name vehicle_owner_optional`

The generated SQL must be exactly:

```sql
ALTER TABLE "Vehicle" ALTER COLUMN "ownerId" DROP NOT NULL;
```

If the CLI cannot prompt in your shell, hand-write that directory and run `npx prisma migrate deploy`, then `npx prisma migrate status` to confirm zero drift. Regenerate the client with `npx prisma generate`.

- [ ] **Step 3: Fix the two display call sites**

Run `npx tsc --noEmit` and fix exactly what it reports:

- `app/(dashboard)/mechanic/vehicles/page.tsx:27` → `ownerName: v.owner?.name ?? 'Sin dueño'`
- `app/(dashboard)/mechanic/board/page.tsx:71` → `ownerName: a.vehicle.owner?.name ?? 'Sin nombre'`

Do not "fix" anything the compiler does not flag — the remaining `ownerId` call sites are correct as written, and the spec explains why.

- [ ] **Step 4: Verify**

`npx tsc --noEmit` clean, `pnpm test` still green (no test asserts a non-null owner).

- [ ] **Step 5: Commit**

`feat: allow a vehicle to exist without a registered owner`

---

### Task 2: Extract one vehicle-field parser

**Files:**
- Create: `lib/vehicleInput.ts`
- Create: `__tests__/lib/vehicleInput.test.ts`
- Modify: `app/api/vehicles/route.ts:15-38`

**Interfaces:**
- Consumes: Task 1.
- Produces: `parseVehicleInput(body): ParsedVehicleInput | { error: string }` — Task 4 calls it.

- [ ] **Step 1: Write the parser**

Model it on `parseHistoryEntryInput` in `lib/vehicleHistory.ts:95-131` — same `| { error: string }` return shape, same style, so the two read alike.

```ts
export type ParsedVehicleInput = {
  make: string
  model: string
  year: number
  vin: string | null
  plate: string | null
  plateState: string | null
  nickname: string | null
  mileage: number | null
}

export function parseVehicleInput(
  body: Record<string, unknown>
): ParsedVehicleInput | { error: string }
```

Rules:
- `make` and `model` are required non-empty strings, trimmed.
- `year` is required and must parse to an integer between 1900 and the current year plus one, else `'Ingresá un año válido'`. **This is what closes the `year: "abc"` → 500 finding** — `Number.parseInt` returning `NaN` must be rejected, not passed to Prisma.
- `mileage` is optional; empty string and `null`/`undefined` become `null`; anything else must be a finite non-negative integer, else `'El kilometraje debe ser un número'`.
- `vin`, `plate`, `plateState`, `nickname` are optional strings, trimmed, empty becomes `null`. Uppercase `vin` and `plate` so the `@unique` VIN lookup in Tasks 3 and 4 is not defeated by case.

- [ ] **Step 2: Test it**

`__tests__/lib/vehicleInput.test.ts` — valid input; missing `make`; `year: "abc"`; `year: ""`; `year: 1780`; `mileage: "muchos"`; `mileage: ""` → `null`; VIN lowercased on input comes back uppercase.

- [ ] **Step 3: Rewire `POST /api/vehicles`**

Replace the inline destructure and the two `parseInt` calls with `parseVehicleInput`, returning `400` with `parsed.error` on failure and spreading `parsed` into `prisma.vehicle.create`. Keep the existing `P2002` → `409 'VIN already registered'` branch and the `ownerId: session.user.id` assignment exactly as they are.

- [ ] **Step 4: Verify**

`pnpm test` — the existing `__tests__/api/vehicles.test.ts` must still pass unchanged. If it does not, the parser changed the route's contract; fix the parser, not the test.

- [ ] **Step 5: Commit**

`refactor: extract and harden vehicle field parsing`

---

### Task 3: Let an owner claim a vehicle by VIN

**Files:**
- Create: `app/api/vehicles/claim/route.ts`
- Create: `__tests__/api/vehicles-claim.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `POST /api/vehicles/claim`, which Task 6's form calls.

- [ ] **Step 1: Write the route**

`POST`, `OWNER` only (`403` otherwise). Body `{ vin }`; `400` if missing or not a string. Uppercase and trim it, then:

```ts
const vehicle = await prisma.vehicle.findUnique({ where: { vin: normalizedVin } })
if (!vehicle || vehicle.ownerId !== null) {
  return NextResponse.json({ error: 'No encontramos un vehículo sin dueño con ese VIN' }, { status: 404 })
}
```

**Both cases must return the identical 404.** Distinguishing "no such VIN" from "already claimed" would confirm to a caller which VINs exist in the system — the spec calls this out as the reason the endpoint is shaped this way. Do not "improve" the error messages here.

Then set `ownerId` to the session user and return the vehicle.

- [ ] **Step 2: Test it**

`403` for a mechanic; `400` for a missing VIN; `404` for an unknown VIN; `404` for a VIN whose vehicle already has an `ownerId` — assert the response body is byte-identical to the unknown-VIN case; success sets `ownerId` and returns `200`.

- [ ] **Step 3: Commit**

`feat: let an owner claim an unowned vehicle by VIN`

---

### Task 4: Create work orders without an appointment

**Files:**
- Create: `app/api/workorders/route.ts`
- Create: `__tests__/api/workorders-create.test.ts`
- Modify: `__tests__/lib/vehicleAccess.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2 (`parseVehicleInput`), `OPEN_WORK_ORDER_STATUSES` and `canAccessVehicleHistory`.
- Produces: `POST /api/workorders`, which Task 5's dialog calls.

- [ ] **Step 1: Write the route**

`POST`, `MECHANIC` with a `workshopId` (`403` otherwise). Body `{ vehicleId?, vehicle?, title, description? }`.

1. `title` required non-empty string, else `400`.
2. Exactly one of `vehicleId` / `vehicle` must be present, else `400 'Enviá un vehículo existente o los datos de uno nuevo'`.
3. **With `vehicleId`:** `canAccessVehicleHistory(session.user, vehicleId)` must pass, else `404`. This keeps a mechanic from opening a ticket on a car their workshop has never seen.
4. **With `vehicle`:** run `parseVehicleInput`; `400` on error. If the parsed VIN is non-null, look it up:
   - matches a vehicle with `ownerId === null` → reuse that row, do not create a duplicate.
   - matches a vehicle with an owner → `409 'Ese VIN pertenece a un vehículo registrado. Pedile al dueño que agende un turno para recibirlo.'`
   - no match → create it with `ownerId: null`.
5. Whichever vehicle results, apply the same guard check-in uses:

```ts
const openWorkOrder = await prisma.workOrder.findFirst({
  where: {
    vehicleId,
    status: { in: OPEN_WORK_ORDER_STATUSES },
    mechanic: { workshopId: session.user.workshopId },
  },
  select: { id: true },
})
if (openWorkOrder) {
  return NextResponse.json({ error: 'Este vehículo ya está en servicio en tu taller' }, { status: 409 })
}
```

6. Create the vehicle (when new) and the `WorkOrder` inside one `prisma.$transaction`, with `status: 'PENDING'`, `mechanicId: session.user.id`, `appointmentId` left unset. Return `201`.

- [ ] **Step 2: Test it**

`403` for an owner and for a mechanic with no `workshopId`; `400` for a missing title, for both vehicle inputs at once, and for neither; `404` for a `vehicleId` outside the workshop; `409` when the vehicle already has an open ticket; `409` when the VIN belongs to an owned vehicle; VIN matching an unowned vehicle reuses it (assert `prisma.vehicle.create` was **not** called); `201` on the happy path for both input shapes.

- [ ] **Step 3: Extend the access test**

In `__tests__/lib/vehicleAccess.test.ts`, add a case where `prisma.vehicle.findUnique` resolves `{ ownerId: null }` and the session user is an `OWNER` — `canAccessVehicleHistory` must return `false`. This pins the property the whole nullable-`ownerId` design rests on.

- [ ] **Step 4: Commit**

`feat: create work orders for walk-in vehicles`

---

### Task 5: "Recibir vehículo" on the board

**Files:**
- Create: `app/(dashboard)/mechanic/board/ReceiveVehicleDialog.tsx`
- Modify: `app/(dashboard)/mechanic/board/Board.tsx`
- Modify: `app/(dashboard)/mechanic/board/page.tsx`

**Interfaces:**
- Consumes: Task 4.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Feed the board its workshop vehicles**

In `page.tsx`, add `getWorkshopVehicles(workshopId)` to the existing `Promise.all` and pass a mapped `{ id, label, plate, vin }[]` into `<Board>` as `workshopVehicles`. Reuse the `vehicleLabel` helper already defined in that file.

- [ ] **Step 2: Build the dialog**

Two tabs, no new primitives — `components/ui/dialog.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `button.tsx` and `FormErrorBanner` cover all of it. Follow `TicketDialog.tsx` for structure and `NewVehicleForm.tsx` for the vehicle field set and its Spanish labels.

- "Ya registrado": a text filter over `workshopVehicles` matching label, plate or VIN case-insensitively; picking one plus a title submits `{ vehicleId, title, description }`.
- "Vehículo nuevo": make, model, year, plate, plateState, VIN, mileage, nickname, plus title and description; submits `{ vehicle: {…}, title, description }`.

On a non-OK response, read `data.error` and show it in the banner — the route's 409s carry copy the mechanic needs to act on. On success, close and `router.refresh()`.

- [ ] **Step 3: Add the trigger**

A primary `Button` in the board header next to the "Turnos y órdenes de trabajo." heading, opening the dialog. Match the existing header's motion-wrapped layout rather than adding a new animation.

- [ ] **Step 4: Commit**

`feat: receive a walk-in vehicle from the mechanic board`

---

### Task 6: Claim section on the owner's new-vehicle page

**Files:**
- Create: `app/(dashboard)/owner/vehicles/new/ClaimVehicleForm.tsx`
- Modify: `app/(dashboard)/owner/vehicles/new/page.tsx`

**Interfaces:**
- Consumes: Task 3.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Build the form**

A `bezel` section below the registration form, headed **"¿Un taller ya cargó tu vehículo?"** with body copy explaining the VIN is on the registration document, one VIN input, and a "Reclamar" button. POST to `/api/vehicles/claim`; on success `router.push('/owner/vehicles/' + vehicle.id)` and `router.refresh()`; on failure show the server's Spanish message through `FormErrorBanner`.

- [ ] **Step 2: Render it**

Add it below the existing `NewVehicleForm` in `page.tsx`, separated by the existing spacing rhythm — no new layout wrapper.

- [ ] **Step 3: Commit**

`feat: let owners claim a workshop-entered vehicle`

---

### Task 7: Full verification, SonarQube pass, and PR

**Files:** none modified unless the checks below surface something.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a PR against `dev`.

- [ ] **Step 1: Run the full gate**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: lint exits 0 (the fixes branch cleared it); every Jest test passes; `coverage/lcov.info` is regenerated; the build completes.

- [ ] **Step 2: Manual QA against a running app**

Run `docker compose up -d db` then `pnpm dev` (do not run the app container at the same time — both bind port 3000).

1. As a mechanic, open `/mechanic/board` → "Recibir vehículo" → "Vehículo nuevo". Enter a car with a VIN and a title. A "Pendiente" ticket appears; the vehicle shows in `/mechanic/vehicles` with **"Sin dueño"**.
2. Try `year: "abc"` in that form → a Spanish validation message, **not** a 500.
3. Log a history entry against that walk-in vehicle as the mechanic — it saves.
4. Press "Recibir vehículo" again for the same car → 409, "ya está en servicio en tu taller".
5. Move the ticket to "Completado", then receive the same car again → succeeds.
6. Register a new owner. On `/owner/vehicles/new`, claim by that VIN → lands on the vehicle page, and the mechanic's history entry from step 3 is visible.
7. Claim the same VIN from a second owner account → the "no encontramos" message, and the vehicle stays with the first owner.
8. Claim a VIN that does not exist → **byte-identical** message to step 7.
9. As the claiming owner, confirm the vehicle now appears on `/owner` and can be booked for a turno.
10. Confirm a *different* owner's dashboard never showed the vehicle at any point in this sequence.

- [ ] **Step 3: SonarQube review (required by CLAUDE.md before a PR)**

Use the `sonarqube:sonarqube-reviewer` agent against the branch diff. Fix any new Critical/Blocker issue or quality-gate failure before continuing. Run `pnpm test` first so `coverage/lcov.info` is not stale.

- [ ] **Step 4: Branch and open the PR**

All work lands on `dev`, so the PR targets `dev`.

```bash
git checkout -b feat/walk-in-work-orders
git push -u origin feat/walk-in-work-orders
gh pr create --base dev --title "feat: walk-in work orders" --body "$(cat <<'EOF'
## Summary

- `Vehicle.ownerId` is now nullable, so a workshop can record a car whose owner has no account — previously a work order required an appointment, which required a registered owner, so a walk-in customer could not be served at all
- New `POST /api/workorders` creates a ticket directly from the board, either against a vehicle the workshop already knows or by recording a new one in the same transaction, reusing the existing "already in service" guard
- New `POST /api/vehicles/claim` lets an owner take ownership of a workshop-entered vehicle by VIN, inheriting its full service history; the endpoint returns the same 404 for an unknown VIN and an already-claimed one so it cannot be used to enumerate VINs
- Vehicle field parsing moved into `lib/vehicleInput.ts` and is shared by both creation routes, which also fixes `year: "abc"` returning a 500 from `POST /api/vehicles`
- Owner-scoped queries needed no changes: they all filter on `ownerId`, and NULL matches no equality predicate, so unowned vehicles are invisible to owners by construction

## Test plan
EOF
)"
```

Fill the `## Test plan` section with checked boxes for each verification actually run, following PRs #8 and #10.
