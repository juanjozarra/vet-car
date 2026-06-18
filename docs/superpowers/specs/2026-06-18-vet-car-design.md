# vet-car MVP Design Spec

**Date:** 2026-06-18
**Status:** Approved

## Overview

vet-car is a vehicle service history platform that digitalizes work orders performed by mechanics on client vehicles. Mechanics manage client profiles, vehicles, quotes, and work orders. Car owners view their vehicle history and approve quotes before work begins.

---

## 1. Data Model

### Entity Relationship

```
Workshop
  └── User (role: MECHANIC, workshopId → Workshop)

ClientProfile (created by Workshop)
  ├── userId?  →  User (role: OWNER, if registered)
  └── Vehicle[]
        ├── Quote[]  (DRAFT → SENT → APPROVED | REJECTED | EXPIRED)
        │     └── QuoteItem[]
        └── WorkOrder[]  (PENDING → IN_PROGRESS → COMPLETED | CANCELLED)
              └── ServiceItem[]

Notification  (in-app, belongs to User)
```

### Schema Changes vs. Current

| Entity | Change |
|---|---|
| `Workshop` | **New** — name, address, phone, email |
| `User` | Add `workshopId?` (required when role = MECHANIC) |
| `ClientProfile` | **New** — name, email, phone, address, `userId?`, `workshopId` |
| `Vehicle` | Replace `ownerId` → `clientProfileId` |
| `Quote` | **New** — title, notes, status, `vehicleId`, `mechanicId`, `responseToken?`, `responseTokenExpiry?` |
| `QuoteItem` | **New** — type, description, laborHours, partsCost |
| `WorkOrder` | Add `quoteId?` (optional link to originating Quote) |
| `ServiceItem` | No change |
| `Notification` | **New** — userId, message, read, type, referenceId |

### Enums

```
Role:               MECHANIC | OWNER
QuoteStatus:        DRAFT | SENT | APPROVED | REJECTED | EXPIRED
WorkOrderStatus:    PENDING | IN_PROGRESS | COMPLETED | CANCELLED
ServiceItemType:    REPAIR | MAINTENANCE | UPGRADE | OTHER
NotificationType:   QUOTE_RECEIVED | QUOTE_APPROVED | QUOTE_REJECTED |
                    WORK_ORDER_STARTED | WORK_ORDER_COMPLETED
```

### Key Design Decisions

- **ClientProfile is the universal vehicle owner.** Every vehicle belongs to a `ClientProfile`, whether the client is registered or not. A `ClientProfile` optionally links to a `User` via `userId`. This avoids dual optional FKs on `Vehicle` and keeps walk-in and registered-user cases on the same code path.
- **Auto-link on registration.** When a new `User` (role OWNER) registers, the system checks for a `ClientProfile` with matching email and sets `clientProfile.userId` automatically.
- **Auto-link on ClientProfile creation.** When a mechanic creates a `ClientProfile` with an email that matches an existing `User`, `userId` is set immediately.

---

## 2. Auth & User Flows

### Registration

Two distinct paths at signup, selected by the user:

**Owner path**
- Fields: name, email, password
- Role set to `OWNER`
- On first login: owner dashboard
- Auto-link to any existing `ClientProfile` with matching email

**Mechanic path**
- Fields: name, email, password
- Role set to `MECHANIC`
- On first login: **Workshop Setup screen** (required before dashboard access)
  - Fields: workshop name, address, phone, email
  - Creates `Workshop` record and sets `user.workshopId`

### JWT Session

Token payload: `{ id, role, workshopId }`. `workshopId` is available on every server-side request, eliminating extra DB calls to scope mechanic data.

### Route Protection

| Route | Requirement |
|---|---|
| `/mechanic/*` | role = MECHANIC |
| `/owner/*` | role = OWNER |
| `/workshop/setup` | role = MECHANIC + `workshopId` is null |
| `/api/quotes/[id]/respond` | Public — validated via signed token |

---

## 3. Mechanic Dashboard Flows

### Client Management

- Mechanic creates `ClientProfile` with: name, email, phone, address (all required)
- `ClientProfile` is scoped to `workshopId`
- If email matches an existing `User` (role OWNER), `userId` is set at creation
- Mechanic can list, view, and edit their clients
- `ClientProfile.email` is unique per `workshopId` (the same client email can appear in different workshops)

### Vehicle Management

- Vehicles are always created in the context of a `ClientProfile`
- Mechanic selects a client, then adds a vehicle: make, model, year, VIN (optional), plate (optional)
- A client can have multiple vehicles
- Mechanic sees all vehicles across their clients, filterable by client name

### Work Order Management (post-quote)

- A `WorkOrder` is created automatically when a `Quote` is approved
- Pre-populated with `ServiceItem`s derived from the `QuoteItem`s (same type, description, cost)
- Mechanic updates items as work is performed: adjusting labor hours, parts cost, adding new items
- Status transitions: `PENDING → IN_PROGRESS → COMPLETED`
- Mechanic manually advances status

---

## 4. Quote Flow

### Lifecycle

```
DRAFT → SENT → APPROVED → (WorkOrder auto-created)
             → REJECTED  → (Mechanic can create new Quote)
             → EXPIRED   → (after 72h, mechanic can re-send)
```

**Create (DRAFT)**
From a vehicle's detail page. Fields: title, notes, one or more `QuoteItem`s (type, description, estimated labor hours, parts cost). Freely editable while in `DRAFT`.

**Send**
Mechanic clicks "Send to Client." Status → `SENT`. Two simultaneous actions:
1. Email sent to `ClientProfile.email` via Resend: quote summary + Approve / Reject signed links
2. In-app `Notification` created for `ClientProfile.userId` (if set), type `QUOTE_RECEIVED`

A signed JWT (`responseToken`, 72h expiry) is generated server-side and stored in plaintext on the `Quote` record (it is short-lived and single-use, not a long-term secret). It is embedded in the email action links.

**Approve / Reject (client action)**
- Via email link (no login required — public API route validates signed token)
- Or via owner dashboard (if registered)

On **approval**:
- `Quote.status` → `APPROVED`, token cleared
- `WorkOrder` auto-created with status `PENDING`, `quoteId` set
- `ServiceItem`s created from `QuoteItem`s
- Mechanic receives `QUOTE_APPROVED` notification

On **rejection**:
- `Quote.status` → `REJECTED`, token cleared
- Mechanic receives `QUOTE_REJECTED` notification
- Mechanic can create a new `Quote` on the same vehicle

**Expiry**
- If no response after 72h, status → `EXPIRED`. Expiry is checked lazily: when the quote detail page loads or when the mechanic lists quotes, any `SENT` quote past its `responseTokenExpiry` is updated to `EXPIRED` at that point. No background job required for MVP.
- Mechanic can re-send (generates a new token, resets expiry, status back to `SENT`)

**Mechanic cancel**
Mechanic can cancel a `SENT` quote → status back to `DRAFT`. Token cleared.

---

## 5. Owner Dashboard

### My Vehicles
All vehicles linked via `ClientProfile.userId`. Shows make/model/year, plate, count of open work orders, count of pending quotes. Click-through to vehicle detail.

### Pending Quotes
All `SENT` quotes awaiting response. Each shows: workshop name, vehicle, line items, total estimated cost. Owner can **Approve** or **Reject** inline. Mirrors the email link action.

### Work Order History
Per vehicle: all `WorkOrder`s with status, service items performed, final cost. Read-only for owners.

### Notifications
In-app bell in nav shows unread notification count. Clicking opens a dropdown list. Clicking a notification marks it read and navigates to the relevant record.

---

## 6. Email & Notifications Infrastructure

### Email (Resend)

- Provider: [Resend](https://resend.com) with `@resend/react` for templating
- Single trigger for MVP: quote sent to client
- Email content: workshop name, vehicle details, `QuoteItem` list, total estimate, Approve / Reject buttons
- Action endpoint: `POST /api/quotes/[id]/respond?token=...&action=approve|reject`
  - Public route (no auth)
  - Validates signed token against `Quote.responseToken` and `responseTokenExpiry`
  - Single-use: token cleared after use

**New environment variables:**
```
RESEND_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### In-App Notifications

- `Notification` records created server-side at each trigger point
- Unread count: `GET /api/notifications/unread` — lightweight, polled by nav bell
- Mark read: `PATCH /api/notifications/[id]/read`
- Notification types and their triggers:

| Type | Trigger |
|---|---|
| `QUOTE_RECEIVED` | Quote sent to client (owner) |
| `QUOTE_APPROVED` | Client approves quote (mechanic) |
| `QUOTE_REJECTED` | Client rejects quote (mechanic) |
| `WORK_ORDER_STARTED` | WorkOrder → IN_PROGRESS (owner) |
| `WORK_ORDER_COMPLETED` | WorkOrder → COMPLETED (owner) |

---

## 7. Implementation Phases

Each phase is independently shippable and gets its own implementation plan.

| Phase | Scope |
|---|---|
| **1 — Auth & Workshop Setup** | Registration split, workshop creation flow, JWT with `workshopId`, route protection |
| **2 — Client & Vehicle Management** | `ClientProfile` CRUD, vehicle creation, auto-link logic, owner vehicle list |
| **3 — Quote Flow** | Quote + QuoteItem CRUD, Resend integration, signed token API, WorkOrder auto-creation, owner approval UI |
| **4 — Work Order Management** | Work order detail, `ServiceItem` CRUD, status transitions, owner history view |
| **5 — Notifications** | `Notification` model, nav bell, unread polling, notification creation at all trigger points |

Implementation begins with Phase 1.
