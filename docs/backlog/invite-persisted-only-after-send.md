# Invite is persisted only after a successful send

**Status:** Needs decision
**Opened:** 2026-08-17
**Source:** Manual testing on PR #15

## What's wrong

`POST /api/workshop/invites` sends the email **first** and writes the
`WorkshopInvite` row only if the send succeeds. When email delivery is broken,
no invite row exists — so there is no token, no link, and no way for an admin to
share the invitation by any other channel.

That turns an email-configuration problem into a total blocker rather than an
inconvenience. It is the reason the invite flow could not be tested at all
during PR #15 review: with Resend rejecting every send, there was nothing to
copy out of the database.

This ordering was a deliberate, documented decision — it exists so a failed send
never leaves a dangling invite. The question is whether that trade is still the
right one.

## Evidence already gathered

- `app/api/workshop/invites/route.ts` — `sendWorkshopInviteEmail(...)` runs
  inside a `try`, and `prisma.workshopInvite.upsert(...)` is only reached after
  it resolves. On failure the handler returns 500 and nothing is written.
- `docs/superpowers/specs/2026-07-24-workshop-staff-management-design.md`
  documents this explicitly: *"sends the invite email via Resend **first** — only
  upserts the `WorkshopInvite` row if the send succeeds."* Changing the order
  contradicts an approved spec.
- `__tests__/api/workshop-invites.test.ts` pins it:
  *"returns 500 and does not persist an invite when the email fails to send"*,
  asserting `expect(mockUpsert).not.toHaveBeenCalled()`.
- The email failure that exposed this was **account configuration, not code**:
  the Resend account has zero verified domains and `RESEND_FROM_EMAIL` was set to
  a `gmail.com` address, which Resend will never send from. Confirmed read-only
  against the Resend domains API (`status 200`, `verified domains: NONE`).
- PR #15 already improved the diagnosis half: the handler now logs and surfaces
  the provider's rejection reason instead of discarding it. That does **not**
  address this entry — the invite still isn't persisted.

## Options considered

**A — Leave as designed.** Once a sending domain is verified, the problem
disappears in practice. Costs nothing. Keeps the flow undebuggable whenever mail
is misconfigured, which is exactly when you most need to see the link.

**B — Persist first, then send; report send failure separately.** The invite row
always exists. If the send fails, return a success-with-warning that includes the
accept URL so the admin can pass it on by hand. Requires deciding what the team
roster shows for an invite that exists but was never delivered — probably a
"no entregada" badge with a copy-link action. Contradicts the spec above, so the
spec needs amending too, and the pinning test needs rewriting.

**C — Keep the ordering, add a manual "copy invite link" action** for an admin,
generating and persisting an invite without attempting delivery at all. Sidesteps
the ordering question entirely and is genuinely useful for a workshop whose staff
are standing next to each other. Adds a second creation path to maintain.

## Decision needed

Whether to change the ordering at all, and if so A, B or C.

Worth noting: **B and C both make the invite flow testable without working
email**, which is currently blocking verification of PR #15's invite work. A
leaves that blocked until a domain is verified in Resend.

## Related

- PR #15 — the review thread where this surfaced
- [workshop-membership-is-one-way.md](workshop-membership-is-one-way.md) — the
  other blocker on this same flow
- `CLAUDE.md` → Environment Setup, for the `RESEND_FROM_EMAIL` requirement that
  caused the original failure
