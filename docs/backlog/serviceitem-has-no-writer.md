# `ServiceItem` has no writer

**Status:** Ready to spec
**Opened:** 2026-08-14
**Source:** Code review of `dev` (migrated from CLAUDE.md "Known gaps")

## What's wrong

`ServiceItem` is fully modelled, labelled, queried and rendered — and nothing in
the codebase ever creates one. No API route, no UI, no seed. `serviceItems` is
therefore always an empty array, which makes the board's chip row permanently
invisible dead UI.

This is the largest gap between what the data model promises and what the product
does. A work order records *that* work happened, with a free-text title, but not
*what* was done, by which category, at what labour or parts cost — which is the
entire premise of a service-history product.

## Evidence already gathered

- `prisma/schema.prisma:206` — `model ServiceItem` with `type`, `description`,
  `laborHours`, `partsCost`, `notes`, `workOrderId`.
- `lib/serviceItemType.ts` — the enum's Spanish label map and options list exist
  and are exported.
- `app/(dashboard)/mechanic/board/page.tsx:41,84` — the board query selects
  `serviceItems` and maps them into the ticket payload.
- `app/(dashboard)/mechanic/board/TicketCard.tsx:33,44` — `TicketCardData` types
  them and `serviceItemCounts()` groups them into badges.
- Grepped the whole tree for any create/insert: the only writes to any Prisma
  model named `serviceItem` are **none**. `ServiceItemType` is used elsewhere only
  because `HistoryEntry.type` reuses the same enum.

Note the enum is shared with `HistoryEntry`, so any change to `ServiceItemType`
affects the owner-facing timeline too.

## Options considered

Not yet explored in depth — this needs its own design pass. The open shape
questions:

- Where does a mechanic add items: inside the existing `TicketDialog`, or a
  dedicated ticket detail page? The dialog is already the ticket's edit surface.
- Do items flow into the owner's `HistoryEntry` timeline on completion? Today
  completing a work order writes **one** entry hardcoded to `type: 'OTHER'` with
  the work order's title (`lib/workOrderStatusEffects.ts`). Aggregating real
  service items is the obvious follow-on and is what CLAUDE.md used to claim
  already happened.
- Are `laborHours` / `partsCost` surfaced to the owner, or mechanic-only? This is
  a pricing-visibility decision, not a technical one.

## Decision needed

None blocking — this is ready for a design spec. The questions above are the
spec's job to answer.

## Related

- `lib/workOrderStatusEffects.ts` — the `COMPLETED` side effect that would need to
  aggregate items instead of writing one generic entry
- `docs/superpowers/specs/2026-07-24-checkin-kanban-board-design.md` — introduced
  the board that renders the chips
