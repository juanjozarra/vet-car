# Work orders have no status transition rules

**Status:** Needs decision
**Opened:** 2026-08-14
**Source:** Code review of `dev` (migrated from CLAUDE.md "Known gaps")

## What's wrong

`PATCH /api/workorders/[id]` validates only that the submitted status is a member
of the enum. Any status can follow any other, and re-sending the current status
re-runs its side effect. Concretely:

- `CANCELLED → COMPLETED` is accepted.
- `PENDING → COMPLETED` is accepted, skipping the work entirely.
- Sending `COMPLETED` twice pushes `closedAt` forward each time, silently
  extending the 24-hour window the board uses to keep closed tickets visible.
- Reverting `COMPLETED → IN_PROGRESS` leaves `closedAt` populated, leaves the
  linked appointment at `COMPLETED`, and leaves the auto-generated `HistoryEntry`
  sitting in the owner's timeline describing work that is no longer finished.

The board's drag-and-drop makes all of these one gesture away.

## Evidence already gathered

- `app/api/workorders/[id]/route.ts:28` — the entire validation:
  ```ts
  if (status !== undefined && !Object.values(WorkOrderStatus).includes(status)) {
  ```
- `lib/workOrderStatusEffects.ts` — `ON_STATUS_CHANGE` is a side-effect table
  keyed by *target* status. It has no notion of the previous status, so it cannot
  express a rule even if one existed. `COMPLETED` writes `closedAt`, completes the
  linked appointment, and creates a `HistoryEntry` (guarded against duplicates by
  a `findFirst`). `CANCELLED` writes `closedAt` and cancels the appointment.
- The handler calls the effect whenever `status !== undefined` — it does **not**
  compare against the current value first, which is what allows re-firing.
- The `HistoryEntry` duplicate guard means re-completing does not duplicate
  timeline entries, but the `closedAt` and appointment writes are unguarded.
- CLAUDE.md described this file as "status transition rules and side effects".
  Only the side effects were ever built; that wording has since been corrected.

## Options considered

**A — Guard the no-ops only.** Skip the effect when the submitted status equals
the current one. One comparison in the handler. Fixes the re-fire class of bugs
(drifting `closedAt`) and nothing else. Smallest possible change.

**B — Declare a legal-transition map** alongside `ON_STATUS_CHANGE`, e.g.
`PENDING → IN_PROGRESS | CANCELLED`, `IN_PROGRESS → COMPLETED | CANCELLED | PENDING`,
`COMPLETED → ∅`, `CANCELLED → ∅`, and reject anything else with a 409. Also
requires deciding whether closed work orders are truly terminal — which affects
the board, since a terminal status means a dragged card must snap back.

**C — B, plus explicit reopen.** If closed states must be reversible (a mechanic
completes the wrong ticket), make reopening a deliberate action that undoes the
side effects — clear `closedAt`, revert the appointment, remove or supersede the
generated `HistoryEntry` — rather than an accidental consequence of a drag.

## Decision needed

Primarily: **are `COMPLETED` and `CANCELLED` terminal?** Everything else follows
from that answer. If they are, B is straightforward. If they are not, C is the
honest option and the undo semantics need specifying — particularly what happens
to a `HistoryEntry` the owner may already have seen.

A is worth shipping regardless; it is independent of the above and fixes a real
drift bug in a couple of lines.

## Related

- `app/(dashboard)/mechanic/board/Board.tsx` — drag-and-drop is the main way
  statuses change; a rejected transition needs UI handling (revert the optimistic
  move and surface why)
- [appointments-cannot-be-cancelled.md](appointments-cannot-be-cancelled.md) —
  the appointment-status coupling described above
