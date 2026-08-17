# No pagination anywhere

**Status:** Open
**Opened:** 2026-08-14
**Source:** Code review of `dev` (migrated from CLAUDE.md "Known gaps")

## What's wrong

Every list query in the app is unbounded. At demo scale nothing hurts; each of
these becomes a problem at a different, fairly low threshold.

The worst is the owner's schedule page, which loads **every workshop in the
database** — not the nearby ones, not a page of them, all of them — and ships the
whole set to the client on first paint. That one degrades as the *platform*
grows, independently of how busy any single user is.

## Evidence already gathered

- `app/(dashboard)/owner/schedule/page.tsx:16` —
  `prisma.workshop.findMany({ orderBy: { name: 'asc' } })`. No `take`, no filter.
  The result is serialised into the client component.
- `lib/vehicleAccess.ts:32` — `getWorkshopVehicles` returns every vehicle ever
  linked to the workshop by an appointment or a work order. Grows monotonically;
  nothing ages out.
- `app/(dashboard)/mechanic/board/page.tsx` — the board query is bounded only by
  `boardWorkOrdersWhere`'s status/grace-period rule (open, or closed within 24h),
  which is a real bound in practice. The "Programado" appointment column has **no**
  bound at all — see the related entry.
- `GET /api/workshops/search` also returns all matches and sorts by distance in
  application code after fetching.

## Options considered

Not explored in depth. Rough ordering by value:

1. **Workshop search / schedule page** — the only one whose growth is
   platform-wide rather than per-tenant. Distance filtering server-side (a
   bounding box on `latitude`/`longitude` before the Haversine sort) would cut
   this down far more cheaply than generic pagination, and `lib/geo.ts` already
   has the distance maths.
2. **Workshop vehicle list** — needs pagination or a date window once a shop has
   a few hundred vehicles. It already has a client-side search box
   (`VehicleSearchList`), which is filtering an unbounded array.
3. **Board** — effectively bounded already; leave alone.

## Decision needed

None. Not urgent at current scale, but worth doing before any real-world pilot —
item 1 in particular, because it degrades for every user as the platform grows
rather than as any one workshop gets busy.

## Related

- [appointments-cannot-be-cancelled.md](appointments-cannot-be-cancelled.md) —
  the unbounded "Programado" column is a missing date bound, not a pagination
  problem, and is fixed there
- `lib/geo.ts` — Haversine helper that a server-side distance filter would build on
