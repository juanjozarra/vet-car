# Workshop membership is one-way

**Status:** Needs decision
**Opened:** 2026-08-17
**Source:** Manual testing on PR #15, plus the code review of 2026-08-14

## What's wrong

A mechanic can join a workshop but can never leave it, and their role can never
change. `workshopRole` is written in exactly two places — `ADMIN` at first-run
workshop setup, `STAFF` on invite acceptance — and nothing ever clears or
promotes it.

The visible symptom, found by manual testing, is that **the staff invite flow is
unusable for any mechanic who already registered normally**:

1. A mechanic registers. `proxy.ts` sends anyone with `role: MECHANIC` and no
   `workshopId` to `/workshop/setup`, and every `/mechanic/**` route bounces them
   back there. The setup page has no skip.
2. So they create a workshop, and now hold a `workshopId`.
3. Inviting them then always fails: `POST /api/workshop/invites` rejects any
   target that is a `MECHANIC` with a `workshopId` set.

There is no state in which an existing mechanic is invitable, and no action they
can take to reach one.

A second consequence of the same root cause: a workshop whose only `ADMIN`
leaves the company is permanently unadministrable. An `ADMIN` cannot remove
themselves, cannot remove another `ADMIN`, and cannot promote a `STAFF` member
to replace them.

## Evidence already gathered

Verified on `dev` — do not re-derive:

- `app/api/workshop/invites/route.ts:30` — the blocking guard:
  ```ts
  if (targetUser?.role === 'MECHANIC' && targetUser.workshopId) {
    return NextResponse.json({ error: 'Ese mecánico ya pertenece a un taller' }, { status: 409 })
  }
  ```
- `proxy.ts:17,33,57` — three separate redirects to `/workshop/setup` for a
  mechanic without a `workshopId`. There is no path around them.
- `app/(dashboard)/workshop/setup/` and `components/workshop/WorkshopSetupForm.tsx`
  — grepped for any skip / "tengo una invitación" / "más tarde" affordance.
  **There is none.** Workshop creation is mandatory to get past registration.
- `app/api/workshop/team/[userId]/route.ts:17,25` — removal refuses self
  (`'No podés quitarte a vos mismo'`) and refuses another `ADMIN`
  (`'No podés quitar a otro administrador'`).
- `app/api/invites/[token]/accept/route.ts` — acceptance sets
  `workshopRole: 'STAFF'`; nothing anywhere sets it back to null except
  `DELETE /api/workshop/team/[userId]`, which an admin must perform on someone else.

**Important correction to the original bug report:** the invite flow is *not*
wholly broken. It works for a **brand-new person**, and PR #15 is what unblocked
that path — `/register?callbackUrl=/invite/TOKEN&email=…&role=MECHANIC` lands
them back on the invite page after registering, so they never see workshop setup
and join the inviting workshop directly. Only the "invite someone who already
owns a workshop" case is impossible. Any fix should preserve the working path.

## Options considered

**A — Keep the current design; fix the copy only.**
Invites are for mechanics who don't yet have a workshop, and that's intentional.
Change the 409 message to say so, e.g. *"Ese mecánico ya tiene su propio taller.
Las invitaciones son para mecánicos que todavía no pertenecen a uno."*
Cheapest. Does nothing for the unadministrable-workshop case, and leaves a real
person unable to change employer without a database edit.

**B — Add "leave workshop".**
A mechanic can leave, which clears `workshopId` and `workshopRole` and makes them
invitable. Guards needed: cannot leave while holding open work orders (the same
rule PR #15 added to admin-initiated removal), and cannot leave if you are the
last `ADMIN` of a workshop that still has staff. Probably pairs with promote /
demote so the last admin can hand over first. This is the option that actually
fixes both symptoms. Own spec.

**C — Make workshop setup skippable.**
A mechanic can exist without a workshop, waiting to be invited. Needs a holding
state — some screen a workshop-less mechanic can sit on — plus changes to the
three `proxy.ts` redirects. Solves invitability for *new* registrations but not
for anyone who already created a workshop, and not the unadministrable case.

## Decision needed

Which of A, B or C. Recommendation is **B**: it is the only one that addresses
both the invite blocker and the last-admin dead end, and the "no open tickets"
guard it needs already exists in
`app/api/workshop/team/[userId]/route.ts` from PR #15 and can be reused rather
than rewritten.

If B, decide also whether promote/demote ships with it or separately.

## Related

- PR #15 — where this was found; see the review comment thread for the original report
- `docs/superpowers/specs/2026-07-24-workshop-staff-management-design.md` — the
  spec that introduced invites and roles; its "Removal is a clean, unrestricted
  reset" decision is the one to revisit
- [invite-persisted-only-after-send.md](invite-persisted-only-after-send.md) —
  separate blocker on the same flow; both must be resolved before the invite
  feature is testable end to end
