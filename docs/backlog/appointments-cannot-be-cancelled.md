# Appointments cannot be cancelled

**Status:** Ready to spec
**Opened:** 2026-08-14
**Source:** Code review of `dev` (migrated from CLAUDE.md "Known gaps")

## What's wrong

`AppointmentStatus.CANCELLED` is read by two queries but **written by nothing**.
An owner who books the wrong slot has no way out, and the slot stays consumed
forever.

There is a second, quieter consequence: nothing ever retires a *past* appointment
either. An appointment only leaves `SCHEDULED` when a mechanic checks it in. Every
no-show therefore stays `SCHEDULED` permanently, keeps occupying its slot in the
availability calculation, and keeps sitting in the mechanic board's "Programado"
column — which has no date bound of its own.

## Evidence already gathered

- `app/api/appointments/` contains only `route.ts` (POST) and
  `[id]/check-in/route.ts`. There is no DELETE, no PATCH, no cancel route.
- `app/api/workshops/[id]/availability/route.ts` filters booked slots with
  `status: { not: 'CANCELLED' }` — it reads the value.
- `app/api/appointments/route.ts` applies the same filter when validating a
  booking. Also reads it.
- `lib/workOrderStatusEffects.ts` writes `status: 'CANCELLED'` on the linked
  **Appointment** when a *work order* is cancelled — that is the only writer, and
  it only fires for appointments that were already checked in.
- `lib/activeRepairs.ts` → `pendingArrivalAppointmentsWhere` filters on workshop,
  `status: 'SCHEDULED'` and no work order — **no `scheduledAt` bound**, which is
  why the column accumulates.
- `@@unique([workshopId, scheduledAt])` on `Appointment` is the double-booking
  guard, so a released slot genuinely becomes bookable again once a row is
  cancelled.

## Options considered

Shape questions for the spec:

- **Who can cancel, and until when?** Owner-initiated is the obvious case. A
  workshop-initiated cancellation ("we're closed that day") is a different
  feature with notification implications — probably out of scope for a first pass.
- **A cutoff?** `getAvailableSlots` already enforces a 120-minute booking lead
  time (`minLeadMinutes`). A symmetric cancellation cutoff would reuse that idea,
  or cancellation stays unrestricted for simplicity.
- **No-shows.** Either a scheduled job that expires past `SCHEDULED` appointments,
  or — much cheaper — the board and availability queries simply stop counting
  appointments whose `scheduledAt` is in the past. The second needs no new
  infrastructure and closes the accumulation problem; worth doing even if
  cancellation itself is deferred.

## Decision needed

None blocking. Note the no-show half can ship independently and is a much smaller
change than cancellation.

## Related

- [no-pagination.md](no-pagination.md) — the unbounded "Programado" column is
  aggravated by the same missing date bound
- `docs/superpowers/plans/2026-08-09-board-duplicates-and-location-input-fixes.md`
  — where the board's grace-period filtering was introduced for work orders but
  not for appointments
