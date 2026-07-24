# Workshop Staff Management — Design Spec

**Date:** 2026-07-24
**Status:** Approved

## Overview

Today every `MECHANIC` who registers either creates their own `Workshop` (via `POST /api/workshop`) or has nowhere to go — there's no way for a second mechanic to join an existing workshop. `Workshop.mechanics: User[]` already supports many mechanics per workshop at the DB level, but nothing populates it beyond one.

This spec adds:
- A workshop-level role (`ADMIN` / `STAFF`) so one mechanic administers the workshop and others just work tickets.
- An email-based invite flow so an `ADMIN` can bring additional mechanics onto their workshop.
- A roster page ("Equipo") to view the team, invite, and remove staff.

This is a prerequisite for the planned check-in/Kanban board spec, which needs a mechanic to assign tickets to. It does not touch `WorkOrder`, `Appointment`, or ticket/board UI — that's the next spec.

---

## 1. Data Model

### Schema Changes vs. Current

| Entity | Change |
|---|---|
| `WorkshopRole` | **New enum** — `ADMIN \| STAFF` |
| `InviteStatus` | **New enum** — `PENDING \| ACCEPTED \| DECLINED \| CANCELLED` |
| `User` | Add `workshopRole WorkshopRole?` (null unless `workshopId` is set) |
| `User` | Add `invitesSent WorkshopInvite[] @relation("InvitesSent")` |
| `WorkshopInvite` | **New** — see below |
| `Workshop` | Add `invites WorkshopInvite[]` |

```prisma
enum WorkshopRole {
  ADMIN
  STAFF
}

enum InviteStatus {
  PENDING
  ACCEPTED
  DECLINED
  CANCELLED
}

model WorkshopInvite {
  id          String       @id @default(cuid())
  workshopId  String
  email       String
  token       String       @unique
  status      InviteStatus @default(PENDING)
  invitedById String
  expiresAt   DateTime
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  workshop  Workshop @relation(fields: [workshopId], references: [id], onDelete: Cascade)
  invitedBy User     @relation("InvitesSent", fields: [invitedById], references: [id])

  @@unique([workshopId, email])
  @@index([token])
}
```

### Key Design Decisions

- **No `WorkshopMember` join table.** A mechanic still belongs to exactly one workshop at a time (existing `User.workshopId` scalar FK) — a role field directly on `User` is sufficient.
- **`ADMIN` is additive, not a replacement role.** The mechanic who creates a workshop (`POST /api/workshop`) becomes its `ADMIN` and keeps doing everything a mechanic already does (work tickets, log history) — plus workshop settings and staff management. A solo shop is just one `ADMIN` with zero `STAFF`; nothing about that flow changes.
- **`@@unique([workshopId, email])` on invites.** Re-inviting the same email replaces the pending invite (new token, new expiry) instead of accumulating duplicate rows.
- **Invites expire after 7 days.**
- **Removal is a clean, unrestricted reset.** An `ADMIN` removing a `STAFF` mechanic clears their `workshopId`/`workshopRole`, returning them to the same unattached-mechanic state as a brand-new registrant. No blacklist, no cooldown — they can immediately create their own workshop or accept another invite, same as anyone else. This mirrors real hiring/firing; adding a restriction is not in scope unless it becomes an actual problem.

---

## 2. API

### Managing staff (ADMIN only)

| Route | Method | Behavior |
|---|---|---|
| `/api/workshop/invites` | POST | Body `{ email }`. Validates requester is `ADMIN`. `400` if target email belongs to an `OWNER`. `409` if target is an existing `MECHANIC` with a `workshopId` already set. Generates a token in memory, sends the invite email via Resend **first** — only upserts the `WorkshopInvite` row if the send succeeds (`500` "no se pudo enviar la invitación" otherwise, nothing persisted). |
| `/api/workshop/invites` | GET | Lists this workshop's `PENDING` invites. |
| `/api/workshop/invites/[id]` | DELETE | Sets status to `CANCELLED`. |
| `/api/workshop/team` | GET | Lists the workshop's mechanics (name, email, `workshopRole`). Any workshop mechanic can call this (roster is visible to `STAFF` too). |
| `/api/workshop/team/[userId]` | DELETE | `ADMIN` only. Clears target's `workshopId`/`workshopRole`. `400` if target is self or another `ADMIN`. |

`PATCH /api/workshop` (existing route — specialties, hours, location) is restricted to `ADMIN` only; `STAFF` gets `403`.

### Accepting/declining (the invited mechanic)

| Route | Method | Behavior |
|---|---|---|
| `/api/invites/[token]/accept` | POST | Requires session with `role === 'MECHANIC'`, `email === invite.email`, `workshopId === null`; invite must be `PENDING` and unexpired (`410` otherwise, `403` on mismatch). Sets `workshopId`/`workshopRole = STAFF`; marks invite `ACCEPTED`. |
| `/api/invites/[token]/decline` | POST | Same guards, marks invite `DECLINED` instead. |

### Error summary

| Case | Response |
|---|---|
| Non-admin calls invite/remove/cancel/`PATCH /api/workshop` | `403` |
| Invite target is an `OWNER` account | `400` |
| Invite target is a `MECHANIC` already in a workshop | `409` |
| Accept/decline: email mismatch or wrong role | `403` |
| Accept/decline: caller already has a workshop | `409` |
| Accept/decline: invite expired/cancelled/already resolved | `410` |
| Remove: target is self or another `ADMIN` | `400` |

---

## 3. Email

`lib/email.ts` wraps the `resend` package (new dependency):

```ts
sendWorkshopInviteEmail({ to, workshopName, inviterName, acceptUrl }): Promise<void>
```

- New env vars: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (defaults to `onboarding@resend.dev` for local/dev). Documented caveat in `.env.example`/CLAUDE.md: Resend's shared dev domain only delivers to the Resend account's own verified address — production needs a verified sending domain.
- Email links to `/invite/[token]`.

---

## 4. UI & Navigation

### `/invite/[token]` (new page, server component)

Reads the invite + workshop name directly.

- **Not logged in** → "Iniciá sesión o registrate para aceptar" with links to `/login?callbackUrl=/invite/[token]` and `/register?callbackUrl=/invite/[token]&email=<invite.email>&role=MECHANIC`.
- **Logged in, wrong role/email, or already has a workshop** → explanatory error state, no action buttons.
- **Logged in, MECHANIC, matching email, no workshop, invite `PENDING` and unexpired** → workshop name/address + Aceptar/Rechazar buttons calling the accept/decline routes.
- **Invite `CANCELLED`/`DECLINED`/`ACCEPTED`/expired** → "Esta invitación ya no es válida."

`/register` accepts `?email=&role=MECHANIC&callbackUrl=` to pre-fill and lock the role selector when arriving from an invite link.

### `/mechanic/team` (new page, new "Equipo" nav item)

Added to `MECHANIC_NAV_ITEMS` as the 4th item (Panel / Vehículos / Equipo / Configuración).

- **Roster** (all mechanics see this): avatar, name, email, role badge.
- **ADMIN-only**:
  - "Invitar mecánico" → dialog with email input → `POST /api/workshop/invites`.
  - "Quitar" button per `STAFF` row (not on own row) → confirm dialog → `DELETE /api/workshop/team/[userId]`.
  - "Invitaciones pendientes" section: email, sent date, expiry, "Cancelar" button.
- **STAFF**: roster only, read-only — no invite/pending-invites/remove controls.

### `/mechanic/settings`

Gains a role guard: `STAFF` hitting this page directly is redirected to `/mechanic` (only `ADMIN` edits workshop config).

---

## 5. Testing

Following the existing mocked-Prisma API route test pattern (`__tests__/api/workshop.test.ts`):

- `__tests__/api/workshop-invites.test.ts` — POST/GET/DELETE on `/api/workshop/invites`, covering the error table in §2.
- `__tests__/api/workshop-team.test.ts` — GET/DELETE on `/api/workshop/team`.
- `__tests__/api/invites-accept.test.ts` — accept/decline guards (email mismatch, already has workshop, expired/resolved invite).
- `lib/email.ts` test mocking the Resend client — no real network calls in CI.

---

## Out of Scope (this pass)

- `WorkOrder`/ticket UI, check-in flow, Kanban board — next spec.
- Admin transfer/leaving a workshop, or having more than one `ADMIN`.
- Any restriction on a removed mechanic immediately creating or joining another workshop.
- Rate limiting on invite creation.
