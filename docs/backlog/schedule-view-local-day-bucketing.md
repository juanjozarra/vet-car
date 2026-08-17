# `ScheduleView` buckets slots by local calendar day

**Status:** Open
**Opened:** 2026-08-14
**Source:** Code review of `dev` (migrated from CLAUDE.md "Known gaps")

## What's wrong

Appointment slots are UTC-anchored naive wall-clock times — that is the
convention `getAvailableSlots` implements and the one every display formatter now
honours. `ScheduleView` breaks it in one place: it groups slots into days using
**local** calendar getters while labelling the times in **UTC**.

So a slot can be filed under one calendar day and read as an hour belonging to
another. It only misbehaves at positive UTC offsets, or for workshops with very
early or very late hours — which is why it has not been reported. It is latent
rather than dormant: the first user in a UTC+ timezone hits it immediately.

## Evidence already gathered

- `app/(dashboard)/owner/schedule/ScheduleView.tsx:305` —
  ```ts
  function dateKey(date: Date): string {
    return `${date.getFullYear()}-${...date.getMonth()...}-${...date.getDate()...}`
  }
  ```
  Local getters, applied to a `Date` that is a UTC wall-clock anchor.
- Directly below it, the time label is formatted with `timeZone: 'UTC'` — the two
  disagree by construction.
- `next14Days` in the same file builds local midnights (`new Date(y, m, d + i)`)
  and those are compared against the slot-derived keys.
- **Why this wasn't fixed with the other timezone bugs in PR #15:** the fix is not
  a formatter swap. `components/ui/date-picker.tsx` renders every cell using local
  getters — `isSameDay`, `buildMonthGrid`, `date.getDate()` — so handing it
  UTC-anchored dates makes the *picker* display wrong instead. The component needs
  a UTC mode first. That was recorded as deliberate out-of-scope in
  `docs/superpowers/plans/2026-08-14-critical-fixes-and-lint-debt.md`.

## Options considered

**A — Give `date-picker.tsx` a UTC mode.** A prop that switches its internal
getters (and `isSameDay` / `buildMonthGrid`) to the UTC variants, then feed it
UTC-anchored days and make `dateKey` UTC. Correct and complete; touches a shared
primitive used elsewhere, so it needs care not to change existing callers.

**B — Convert at the boundary.** Keep the picker local, and translate between
"workshop day" (UTC) and "calendar day" (local) when reading and writing
`slotsByDate`. Avoids touching the shared component, but puts a subtle conversion
in the one file that has already been wrong once — the kind of thing that gets
re-broken.

**C — Accept it.** Document the limitation and revisit if the product ever serves
a positive-offset timezone. The product is currently Spanish (Latin American) and
the whole market sits at negative offsets.

## Decision needed

None urgent. If the app is ever offered outside the Americas, A becomes required.
Recommendation is **A** whenever the date picker is next touched for another
reason — doing it opportunistically is much cheaper than a dedicated pass.

## Related

- `lib/availability.ts` — the UTC anchoring and the shared slot formatters; the
  convention this entry violates is documented there and in `CLAUDE.md` under
  "Conventions that have bitten us"
- PR #15 — fixed the two display-side timezone bugs; deliberately left this one
