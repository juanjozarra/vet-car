# Backlog

Deferred work: things that are modelled or documented but not implemented, fixes
we chose not to make yet, and verification still owed. **One file per item**, each
carrying the analysis behind it — the evidence already gathered, the options
already weighed, and the decision still outstanding.

The point is that picking an item up later costs no re-investigation. If you find
yourself re-deriving something to work on an entry, that entry was underwritten —
fix it while you're there.

This is the single source of truth for "what's not built". `CLAUDE.md` points here
rather than keeping its own list, so the two can't drift apart.

## Queue

| Item | Status | Blocked on |
|---|---|---|
| [Workshop membership is one-way](workshop-membership-is-one-way.md) | Needs decision | Product call: A, B or C |
| [Invite is persisted only after a successful send](invite-persisted-only-after-send.md) | Needs decision | Product call — contradicts an approved spec |
| [`ServiceItem` has no writer](serviceitem-has-no-writer.md) | Ready to spec | — |
| [Appointments cannot be cancelled](appointments-cannot-be-cancelled.md) | Ready to spec | — |
| [Work orders have no status transition rules](work-order-status-transitions.md) | Needs decision | Which transitions are legal |
| [No pagination anywhere](no-pagination.md) | Open | Not urgent at current scale |
| [`ScheduleView` buckets slots by local calendar day](schedule-view-local-day-bucketing.md) | Open | Needs a UTC mode in the date picker |
| [Manual QA owed on PRs #15 and #16](manual-qa-pending-prs-15-16.md) | Pending verification | Needs a human with a browser |

## Status vocabulary

- **Needs decision** — understood and analysed; blocked on a human choosing between options.
- **Ready to spec** — no open questions; next step is a design spec in `docs/superpowers/specs/`.
- **Open** — understood, no blocker, not scheduled.
- **Pending verification** — the work exists; someone has to confirm it behaves.

## Entry shape

```markdown
# Title

**Status:** one of the above
**Opened:** YYYY-MM-DD
**Source:** where it came from (PR review, code review, session)

## What's wrong
## Evidence already gathered      ← the section that saves the re-investigation
## Options considered
## Decision needed
## Related
```

## Lifecycle

An item graduates by becoming a design spec in `docs/superpowers/specs/`, then an
implementation plan in `docs/superpowers/plans/`. When the work merges, delete the
backlog entry — the spec and the code are the record from that point on. A stale
entry describing something already built is worse than no entry.
