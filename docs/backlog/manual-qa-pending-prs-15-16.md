# Manual QA owed on PRs #15 and #16

**Status:** Pending verification
**Opened:** 2026-08-17
**Source:** PR #15 and #16 test plans

## What's wrong

Nothing is known to be broken. Both PRs shipped with automated coverage — tests,
typecheck, build, and a published SonarQube analysis — but their behavioural
checklists need a browser and a running app, and were left unticked rather than
claimed. This entry exists so that owed verification does not evaporate when the
PRs merge.

Delete this file once the checks below have been run.

## Evidence already gathered

Automated state at the time of writing, on the merged combination of all
branches: 32 suites / 232 tests passing, `pnpm lint` 0 errors, `tsc` clean,
production build passing, SonarQube quality gate OK with 0 Critical and 0 Blocker,
ratings A across reliability, security and maintainability.

The database migration in #16 has since been applied to a database with existing
rows and verified: `ownerId` became nullable, the existing vehicle **kept its
owner**, and the FK is `ON DELETE SET NULL` (`confdeltype = n`). That was the one
item the implementing agent flagged as untested, and it is now closed.

## The checks still owed

**From PR #15:**

1. Invite an email with no account; open the link **logged out** → the invite page
   renders, no bounce to `/login`.
2. Register from that page → land back on the invite, *not* `/workshop/setup`;
   accept → STAFF at that workshop.
3. Book a 09:00 turno → `/mechanic/board` reads **"18 ago, 09:00"** (day and hour,
   in the workshop's own clock).
4. Owner dashboard date chip shows the day the owner actually picked.
5. Remove a mechanic holding an open ticket → 409 with the Spanish count message;
   reassign from the board, then removal succeeds.

Checks 1 and 2 are the ones to watch — the redirect chain traces correctly in
code but only a real browser confirms it. **Both are currently blocked**: see the
related entries, because invite email delivery does not work and no invite row is
persisted when it fails.

**From PR #16:**

6. Walk-in creation end to end; the vehicle shows "Sin dueño" in `/mechanic/vehicles`.
7. `year: "abc"` in the intake dialog surfaces a Spanish message, not a 500.
8. Receive the same car twice → 409; succeeds again after the ticket is completed.
9. Claim by VIN lands on the vehicle page with the mechanic's history entries visible.
10. A second owner claiming the same VIN gets the byte-identical "no encontramos" message.
11. **A different owner's dashboard never shows the walk-in vehicle at any point.**

Check 11 is the highest value on this list. It is the core security property of
the nullable-`ownerId` design, and it currently rests on reasoning plus a single
unit test rather than on observed behaviour.

## Decision needed

None — this is execution, not a decision. Note that checks 1 and 2 cannot be
performed until the invite blockers are resolved.

## Related

- [workshop-membership-is-one-way.md](workshop-membership-is-one-way.md) — blocks check 2
- [invite-persisted-only-after-send.md](invite-persisted-only-after-send.md) — blocks checks 1 and 2
- PRs #15 and #16 — the full test plans, with the automated items already ticked
