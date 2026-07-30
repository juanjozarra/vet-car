# Owner Dashboard — Vehicle Status Timeline

Date: 2026-07-30

## Problem

The owner dashboard (`app/(dashboard)/owner/DashboardContent.tsx`) already renders an "active repairs" timeline for vehicles currently at a workshop, but it's a prototype: the 4 visual stages (Ingresado → Inspección → Reparando → Listo) are faked from only two real `WorkOrderStatus` values (`PENDING`, `IN_PROGRESS`) — `IN_PROGRESS` always maps to "Reparando", so "Inspección" is never actually distinguishable from "Reparando". There's also no grace period after a work order finishes or gets cancelled — it just vanishes from the query on the next load — and no reduced-motion support on the pulsing current-step indicator.

This spec redesigns that timeline so every stage it shows is backed by a real, mechanic-set value, and refines the motion to match the project's `motion-ui` conventions.

## Scope

- Owner dashboard hub only (`app/(dashboard)/owner/page.tsx` + `DashboardContent.tsx`). The per-vehicle detail page (`/owner/vehicles/[id]`) is out of scope — it stays history-only.
- Mechanic-side: a small addition to the existing `TicketCard.tsx` status controls on the board, to let mechanics set the new sub-stage.
- No changes to `lib/vehicleHistory.ts` or the `HistoryEntry` model.

## Data model changes

Two additions to `WorkOrder` (`prisma/schema.prisma`):

```prisma
enum WorkOrderProgressStage {
  INSPECTING
  REPAIRING
  WAITING_PARTS
}

model WorkOrder {
  // ...existing fields
  progressStage WorkOrderProgressStage?
  closedAt      DateTime?
}
```

- `progressStage` is only meaningful while `status = IN_PROGRESS`. It's set to `INSPECTING` automatically the moment a work order transitions into `IN_PROGRESS` (if not already set), and can be changed freely by the mechanic afterward — no enforced ordering. It's not cleared on `COMPLETED`/`CANCELLED`; it just stops being read once the work order isn't `IN_PROGRESS`.
- `closedAt` is stamped once, the moment a work order reaches `COMPLETED` or `CANCELLED`. It exists solely to back the 24h dashboard grace period below — using the existing `updatedAt` was considered and rejected, since any later, unrelated edit to the row would silently reset the grace window.

Both are set inside `lib/workOrderStatusEffects.ts`, in the same `ON_STATUS_CHANGE` map that already handles `COMPLETED`/`CANCELLED` side effects (Appointment status sync, HistoryEntry creation) — plus a new entry for `IN_PROGRESS` to default `progressStage`.

Requires `npx prisma migrate dev --name add_work_order_progress_stage`.

## Visibility rule

A vehicle's card appears on the owner dashboard if it has a `WorkOrder` where:

- `status` is `PENDING` or `IN_PROGRESS` (always shown — the vehicle is physically at the shop), **or**
- `status` is `COMPLETED` or `CANCELLED` **and** `closedAt >= now - 24h` (grace period so the owner doesn't miss the final update if they don't check same-day).

`app/(dashboard)/owner/page.tsx`'s existing query (currently `IN_PROGRESS`-only, top 3) is widened to this rule, with no cap — every matching vehicle gets a card, stacked vertically.

## Timeline stages

Five fixed stepper positions, always rendered in this order, regardless of whether every stage was actually visited:

```
Recibido → Inspección → Reparando → Esperando repuestos → Listo
```

Current-step index is derived directly from `status`/`progressStage` (same derivation style as today's `timelineCurrentStep`, no stage-visit history is tracked):

| status | progressStage | current step |
|---|---|---|
| PENDING | — | Recibido |
| IN_PROGRESS | INSPECTING | Inspección |
| IN_PROGRESS | REPAIRING | Reparando |
| IN_PROGRESS | WAITING_PARTS | Esperando repuestos |
| COMPLETED | — | Listo (all 5 render as done) |

If a work order goes straight from Reparando to Listo without ever entering "Esperando repuestos", that stage still renders as done (checked) once the order completes — it reads as "didn't block on parts" rather than "was skipped," and keeps the stepper's layout identical across every card (no width/step-count changes to animate between).

If the mechanic moves `progressStage` backward (e.g. Reparando → Esperando repuestos), the stepper simply re-renders from the new current value — there's no stored history to contradict, matching how the existing prototype already behaves.

**Cancelled is not a stage on this stepper.** A `CANCELLED` work order replaces the whole timeline block with a compact "Cancelado" card — red badge, static (non-pulsing) dot, no step row — since cancellation can happen from any point and forcing it onto the stepper would misrepresent how far the work actually got.

## Mechanic-side control

`TicketCard.tsx` gets a second `Select`, rendered directly below the existing status `Select`, visible only when `ticket.status === 'IN_PROGRESS'`. Its three options are the `WorkOrderProgressStage` values (Spanish labels: Inspección / Reparando / Esperando repuestos), following the same `WORK_ORDER_STATUS_OPTIONS`-style constant pattern already in `lib/workOrderStatus.ts` (new sibling file or additions to it). Selecting a value calls the existing `PATCH /api/workorders/[id]` with `{ progressStage }` added to the request body; the route accepts it as an optional field alongside `status`.

## Motion (motion-ui conventions, reusing `lib/motionTokens.ts`)

- The current-step indicator keeps its existing pulse (`scale: [1, 1.15, 1]`, infinite loop, amber glow) — this is the "circle with pulse effect" the design is built around — but only while the work order is actually active (`PENDING`/`IN_PROGRESS`). It's wrapped in `useReducedMotion()` (not present today) so it collapses to a static ring under reduced-motion preference.
- The finished "Listo" step (once `COMPLETED`) renders as a solid checkmark, matching the other `done` steps — no pulse — since pulsing communicates "in progress," not "finished."
- The card list is wrapped in `AnimatePresence mode="popLayout"` so a card entering the grace window, or dropping off after it expires or a new work order appears, animates in/out instead of popping — remaining cards reflow smoothly.
- Progress-bar fill and per-step fade-in reuse the existing `motionTokens.duration`/`easing.fluid`/`easing.smooth` values already used in this component; no new tokens.

## Testing

- `lib/workOrderStatusEffects.ts`: unit tests (Jest, matching existing test patterns in the repo) covering — `IN_PROGRESS` transition defaults `progressStage` to `INSPECTING` only if unset; `COMPLETED`/`CANCELLED` both stamp `closedAt`.
- Owner dashboard query: a test verifying the visibility rule (PENDING/IN_PROGRESS always included; COMPLETED/CANCELLED included only within 24h of `closedAt`, excluded after).
- Manual/UI verification: mechanic board shows the sub-stage selector only for `IN_PROGRESS` tickets; owner dashboard timeline reflects each of the 5 stages, the Cancelado card variant, and reduced-motion fallback.
