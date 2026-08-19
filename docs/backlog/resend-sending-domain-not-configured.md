# Resend has no verified sending domain

**Status:** Needs setup
**Opened:** 2026-08-17
**Source:** PR #15 review — noted at merge that invite sending was never exercised

## What's wrong

The workshop staff invite feature is merged and its logic is covered by tests,
but **no invite email has ever actually been sent**. The Resend account backing
it has no verified sending domain, so every delivery attempt is refused before it
leaves the provider.

This is configuration, not code. Nothing in the repository needs to change to fix
it — but until it is fixed, one shipped feature cannot be confirmed to work at
all, and the invite flow cannot be exercised end to end by anyone.

## Evidence already gathered

Confirmed read-only against the Resend API (no email sent, no state changed):

```
configured FROM: juanjozarra4896@gmail.com
domains API status: 200
  verified domains: NONE
```

- Resend only sends from a domain you have verified. `gmail.com` is not a domain
  the account can verify — it belongs to Google — so the configured
  `RESEND_FROM_EMAIL` can never work.
- The account has **zero** verified domains, so no from-address currently works
  except Resend's shared sandbox.
- The API key itself is valid. During PR #15 review the Resend dashboard showed
  "last used" updating, which was the clue: requests do arrive and are **rejected**
  on the from-address, rather than failing authentication.
- PR #15 improved diagnosis for this: `POST /api/workshop/invites` now logs the
  provider's rejection reason and passes it through, instead of returning a bare
  "No se pudo enviar la invitación". The next attempt will say *why* it failed.

## Options considered

**A — Verify a domain you own.** Add it in the Resend dashboard, complete the DNS
records, then set `RESEND_FROM_EMAIL="invites@thatdomain.com"`. The only option
that makes invites work for real recipients, and the only one viable beyond local
testing. Requires owning a domain and having DNS access.

**B — Use the sandbox: `RESEND_FROM_EMAIL="onboarding@resend.dev"`.**
Works with no DNS setup, **but Resend's shared domain only delivers to the account
owner's own verified address**. That address is already the workshop admin
account, and inviting it is rejected by the guard in
[workshop-membership-is-one-way.md](workshop-membership-is-one-way.md) before any
email is attempted. **So this does not actually make the flow testable here** —
it was ruled out during PR #15 review, not merely deprioritised.

**C — Make the flow testable without email at all.** Persist the invite before
sending and surface a copyable link, so an admin can deliver it by any channel.
That is a separate open decision — see
[invite-persisted-only-after-send.md](invite-persisted-only-after-send.md) — and
it would unblock verification without any Resend configuration whatsoever.

## Decision needed

Whether to do **A** (real domain) or **C** (remove the email dependency for
testing). They are not mutually exclusive, and C is worth having regardless: it
makes the feature demonstrable in environments that will never have mail
configured, which includes every fresh clone of this repo.

Worth noting **B is not a shortcut** here, despite looking like one — the
membership guard closes it off.

## Related

- [manual-qa-pending-prs-15-16.md](manual-qa-pending-prs-15-16.md) — checks 1 and
  2 there are blocked by this
- [invite-persisted-only-after-send.md](invite-persisted-only-after-send.md) —
  option C above
- `CLAUDE.md` → Environment Setup, which already warns that
  `onboarding@resend.dev` "only delivers to your own verified Resend account
  address — use a verified sending domain in production"
