# Workshop Staff Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a workshop's `ADMIN` mechanic invite additional mechanics by email; invited mechanics join as `STAFF` and can be removed later, laying the groundwork for the upcoming check-in/Kanban ticket board.

**Architecture:** Two new Prisma enums (`WorkshopRole`, `InviteStatus`) plus a `WorkshopInvite` model. A `workshopRole` field carried through the NextAuth JWT/session (alongside the existing `workshopId`) gates every admin-only route. A thin Resend wrapper (`lib/email.ts`) sends the invite; a single shared helper (`lib/workshopInvite.ts`) decides whether a token is still usable, reused by the accept/decline routes and the public invite-landing page. New UI: a "Equipo" tab on the mechanic dashboard, and light query-param passthrough on the existing register/select-role/login pages so an invited mechanic's signup lands them back on the invite.

**Tech Stack:** Next.js 16 App Router (Server Components + Route Handlers), Prisma 7, NextAuth 4 (JWT sessions), `resend` (new dependency) for transactional email, Jest for API/lib tests.

## Global Constraints

- `ADMIN` is additive, not a replacement role — the mechanic who creates a workshop keeps doing everything a mechanic already does, plus workshop settings and staff management.
- Invites expire 7 days after creation/re-invite.
- `@@unique([workshopId, email])` on `WorkshopInvite` — re-inviting the same email replaces the pending invite (new token, new expiry) rather than creating a duplicate row.
- The invite email is sent **before** the `WorkshopInvite` row is persisted — if Resend errors, nothing is written and the request fails with `500`. No orphaned invites for emails that were never delivered.
- Removing a `STAFF` mechanic is a full, unrestricted reset — no cooldown, no blacklist. They immediately become an unattached mechanic, same as a new registrant.
- Every admin-gated route checks `session.user.workshopRole !== 'ADMIN'` → `403`, after a `401` check for no session at all. This is a deliberate split from this codebase's existing `/api/workshop` `POST` convention (which conflates "no session" and "wrong role" into a single `401`) — the approved spec calls for `401`/`403` to be distinct, so new routes follow that instead.
- `RESEND_FROM_EMAIL` defaults to `onboarding@resend.dev` for local/dev; production needs a verified sending domain (documented only, not enforced in code).
- All user-facing copy is in Spanish (Latin American), matching every existing page in this app.
- Every new UI reuses existing primitives from `components/ui/*` and the `bezel`/`bezel-core` layout classes already used throughout the dashboard — no new visual patterns.
- This repo's test suite covers pure logic and API routes only (see existing `__tests__/api/*.test.ts`, `__tests__/lib/*.test.ts`) — there is no component-testing setup, so UI component/page tasks in this plan do not add tests, matching existing convention (see the `2026-07-14-vehicle-service-history.md` plan for precedent).

---

### Task 1: Schema — `WorkshopRole`, `InviteStatus`, `User.workshopRole`, `WorkshopInvite`

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `WorkshopRole` enum (`ADMIN | STAFF`), `InviteStatus` enum (`PENDING | ACCEPTED | DECLINED | CANCELLED`), `User.workshopRole: WorkshopRole?`, `WorkshopInvite` model with fields `id, workshopId, email, token, status, invitedById, expiresAt, createdAt, updatedAt`.

- [ ] **Step 1: Add the two enums**

Add after `enum HistorySource`:

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
```

- [ ] **Step 2: Add `workshopRole` and the invite relation to `model User`**

In `model User`, add this field directly after `workshopId`:

```prisma
  workshopRole  WorkshopRole?
```

In the same model's relations block, add after `workOrders`:

```prisma
  invitesSent WorkshopInvite[] @relation("InvitesSent")
```

- [ ] **Step 3: Add the invites relation to `model Workshop`**

In `model Workshop`, add to the relations block, after `hours`:

```prisma
  invites WorkshopInvite[]
```

- [ ] **Step 4: Add the `WorkshopInvite` model**

Add after `model HistoryEntry` (end of file):

```prisma
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

- [ ] **Step 5: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 6: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: completes with no errors; `WorkshopRole`, `InviteStatus`, and `WorkshopInvite` types are now available from `@prisma/client`.

- [ ] **Step 7: Create and apply the migration**

Requires the dev database running — if it isn't, run `docker compose up -d db` first (per `CLAUDE.md`).

Run: `npx prisma migrate dev --name add_workshop_staff_roles`
Expected: a new folder under `prisma/migrations/` and `Your database is now in sync with your schema.`

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add WorkshopRole, InviteStatus, and WorkshopInvite model"
```

---

### Task 2: Carry `workshopRole` through the session/JWT

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/auth.ts`

**Interfaces:**
- Consumes: `WorkshopRole` (Task 1)
- Produces: `session.user.workshopRole: WorkshopRole | null` available in every server-side `getServerSession(authOptions)` call.

- [ ] **Step 1: Add `workshopRole` to the NextAuth type extensions**

Replace the full contents of `types/index.ts`:

```ts
import 'next-auth'
import { Role, WorkshopRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    workshopId: string | null
    workshopRole: WorkshopRole | null
  }

  interface Session {
    user: {
      id: string
      role: Role
      workshopId: string | null
      workshopRole: WorkshopRole | null
      email: string
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    workshopId: string | null
    workshopRole: WorkshopRole | null
  }
}
```

- [ ] **Step 2: Carry `workshopRole` through `authorize`, `jwt`, and `session` in `lib/auth.ts`**

Replace the full contents of `lib/auth.ts`:

```ts
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const normalizedEmail = credentials.email.toLowerCase().trim()
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        // Return only what the token needs. NEVER include `image`: it holds a
        // data-URL avatar that NextAuth would map to the JWT `picture` claim,
        // bloating the session cookie past the header limit (431 errors).
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workshopId: user.workshopId,
          workshopRole: user.workshopRole,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Never carry the avatar in the JWT — a data-URL image would blow the
      // session cookie past the server header limit. It's read from the DB
      // where it's displayed instead.
      delete token.picture
      if (user) {
        token.id = user.id
        token.role = user.role
        token.workshopId = user.workshopId ?? null
        token.workshopRole = user.workshopRole ?? null
      }
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id } })
        if (dbUser) {
          token.workshopId = dbUser.workshopId ?? null
          token.workshopRole = dbUser.workshopRole ?? null
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.workshopId = token.workshopId ?? null
        session.user.workshopRole = token.workshopRole ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/auth.ts
git commit -m "feat: carry workshopRole through the session and JWT"
```

---

### Task 3: Workshop creation grants ADMIN; settings PATCH becomes admin-only

**Files:**
- Modify: `app/api/workshop/route.ts`
- Modify: `__tests__/api/workshop.test.ts`

**Interfaces:**
- Consumes: `session.user.workshopRole` (Task 2)
- Produces: `POST /api/workshop` sets the creator's `workshopRole` to `'ADMIN'`; `PATCH /api/workshop` returns `403` unless `session.user.workshopRole === 'ADMIN'`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `__tests__/api/workshop.test.ts`:

```ts
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshop: { create: jest.fn(), update: jest.fn() },
    workshopHours: { deleteMany: jest.fn(), createMany: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST, PATCH } from '@/app/api/workshop/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockWorkshopCreate = prisma.workshop.create as jest.Mock
const mockWorkshopUpdate = prisma.workshop.update as jest.Mock
const mockUserUpdate = prisma.user.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest(method: string, body: object) {
  return new Request('http://localhost/api/workshop', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' }

describe('POST /api/workshop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not a mechanic', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(401)
  })

  it('returns 409 when workshop already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: 'ws-existing' } })
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(409)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest('POST', { name: 'AutoShop' }))
    expect(res.status).toBe(400)
  })

  it('creates workshop, sets the creator as ADMIN, and returns 201', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1', ...validBody })

    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' },
    })
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { workshopId: 'ws-1', workshopRole: 'ADMIN' },
    })
    const data = await res.json()
    expect(data.id).toBe('ws-1')
  })
})

describe('PATCH /api/workshop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is STAFF, not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(403)
    expect(mockWorkshopUpdate).not.toHaveBeenCalled()
  })

  it('updates workshop settings and returns 200 for ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'a1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
    })
    mockWorkshopUpdate.mockResolvedValue({ id: 'ws1', slotDurationMinutes: 90 })

    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slotDurationMinutes).toBe(90)
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest __tests__/api/workshop.test.ts`
Expected: FAIL — the "sets the creator as ADMIN" and PATCH `403`/`200` tests fail (`workshopRole` not set, no `workshopRole` guard yet).

- [ ] **Step 3: Update the route**

In `app/api/workshop/route.ts`, change the `tx.user.update` call inside `POST`'s transaction:

```ts
      await tx.user.update({
        where: { id: session.user.id },
        data: { workshopId: ws.id, workshopRole: 'ADMIN' },
      })
```

Add an admin guard to `PATCH`, right after the existing auth/workshopId check:

```ts
  if (!session || session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/workshop.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/workshop/route.ts __tests__/api/workshop.test.ts
git commit -m "feat: grant ADMIN on workshop creation, restrict settings PATCH to ADMIN"
```

---

### Task 4: Invite email — `lib/email.ts`

**Files:**
- Modify: `package.json` (add `resend`)
- Modify: `.env.example`
- Modify: `CLAUDE.md`
- Create: `lib/email.ts`
- Test: `__tests__/lib/email.test.ts`

**Interfaces:**
- Produces: `sendWorkshopInviteEmail({ to, workshopName, inviterName, acceptUrl }: { to: string; workshopName: string; inviterName: string; acceptUrl: string }): Promise<void>` — throws on failure.

- [ ] **Step 1: Install the dependency**

Run: `npm install resend`
Expected: added to `package.json` dependencies.

- [ ] **Step 2: Write the failing tests**

```ts
// __tests__/lib/email.test.ts
const mockSend = jest.fn()
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}))

import { sendWorkshopInviteEmail } from '@/lib/email'

describe('sendWorkshopInviteEmail', () => {
  beforeEach(() => jest.clearAllMocks())

  const args = {
    to: 'mech@test.com',
    workshopName: 'AutoShop',
    inviterName: 'Juan',
    acceptUrl: 'http://localhost:3000/invite/tok123',
  }

  it('sends an email addressed to the invitee, mentioning the workshop', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    await sendWorkshopInviteEmail(args)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mech@test.com',
        subject: expect.stringContaining('AutoShop'),
        html: expect.stringContaining('http://localhost:3000/invite/tok123'),
      })
    )
  })

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'invalid domain' } })
    await expect(sendWorkshopInviteEmail(args)).rejects.toThrow('invalid domain')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/lib/email.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email'`

- [ ] **Step 4: Implement `lib/email.ts`**

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendWorkshopInviteEmail({
  to,
  workshopName,
  inviterName,
  acceptUrl,
}: {
  to: string
  workshopName: string
  inviterName: string
  acceptUrl: string
}): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${inviterName} te invitó a unirte a ${workshopName} en VetCar`,
    html: `
      <p>${inviterName} te invitó a unirte a <strong>${workshopName}</strong> como mecánico en VetCar.</p>
      <p><a href="${acceptUrl}">Aceptar invitación</a></p>
      <p>Este enlace vence en 7 días.</p>
    `,
  })

  if (error) {
    throw new Error(error.message)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/email.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Document the required env vars**

In `.env.example`, add after `BLOB_READ_WRITE_TOKEN`:

```
# Resend (workshop staff invite emails). Get an API key at resend.com
# (or provision via the Vercel Marketplace), then set it locally or
# `vercel env pull .env.local`.
RESEND_API_KEY=""
# Resend's shared dev domain only delivers to your own verified Resend
# account address — use a verified sending domain in production.
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

In `CLAUDE.md`, add `RESEND_API_KEY=""` and `RESEND_FROM_EMAIL="onboarding@resend.dev"` to the `Environment Setup` code block, with a one-line comment matching the style of the `BLOB_READ_WRITE_TOKEN` entry.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json lib/email.ts __tests__/lib/email.test.ts .env.example CLAUDE.md
git commit -m "feat: add Resend-based workshop invite email"
```

---

### Task 5: Invite validity helper — `lib/workshopInvite.ts`

**Files:**
- Create: `lib/workshopInvite.ts`
- Test: `__tests__/lib/workshopInvite.test.ts`

**Interfaces:**
- Consumes: `WorkshopInvite` (Task 1)
- Produces: `getPendingInvite(token: string): Promise<(WorkshopInvite & { workshop: { name: string; address: string } }) | null>` — `null` for not-found, wrong status, or expired. This is the single place "is this invite still usable" is decided; the accept/decline routes (Task 9) and the landing page (Task 10) both call it instead of re-implementing the check.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/workshopInvite.test.ts
jest.mock('@/lib/prisma', () => ({
  prisma: { workshopInvite: { findUnique: jest.fn() } },
}))

import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockFindUnique = prisma.workshopInvite.findUnique as jest.Mock

describe('getPendingInvite', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when the invite does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns null when the invite is not PENDING', async () => {
    mockFindUnique.mockResolvedValue({
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns null when the invite has expired', async () => {
    mockFindUnique.mockResolvedValue({
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns the invite when PENDING and unexpired', async () => {
    const invite = {
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86_400_000),
      email: 'm@test.com',
      workshop: { name: 'AutoShop', address: '123 Main St' },
    }
    mockFindUnique.mockResolvedValue(invite)
    expect(await getPendingInvite('tok')).toEqual(invite)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: 'tok' },
      include: { workshop: { select: { name: true, address: true } } },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/workshopInvite.test.ts`
Expected: FAIL — `Cannot find module '@/lib/workshopInvite'`

- [ ] **Step 3: Implement `lib/workshopInvite.ts`**

```ts
import { prisma } from './prisma'

export async function getPendingInvite(token: string) {
  const invite = await prisma.workshopInvite.findUnique({
    where: { token },
    include: { workshop: { select: { name: true, address: true } } },
  })
  if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return null
  }
  return invite
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/workshopInvite.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/workshopInvite.ts __tests__/lib/workshopInvite.test.ts
git commit -m "feat: add getPendingInvite helper"
```

---

### Task 6: Create and list invites — `POST`/`GET /api/workshop/invites`

**Files:**
- Create: `app/api/workshop/invites/route.ts`
- Test: `__tests__/api/workshop-invites.test.ts`

**Interfaces:**
- Consumes: `session.user.workshopRole` (Task 2), `sendWorkshopInviteEmail` (Task 4)
- Produces: `POST /api/workshop/invites` (body `{ email }`) → `201` with `{ id, email, expiresAt }`; `GET /api/workshop/invites` → `200` with an array of `{ id, email, createdAt, expiresAt }` for the caller's workshop's `PENDING` invites.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/workshop-invites.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/email', () => ({ sendWorkshopInviteEmail: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    workshop: { findUnique: jest.fn() },
    workshopInvite: { upsert: jest.fn(), findMany: jest.fn() },
  },
}))

import { POST, GET } from '@/app/api/workshop/invites/route'
import { getServerSession } from 'next-auth'
import { sendWorkshopInviteEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockSend = sendWorkshopInviteEmail as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockWorkshopFindUnique = prisma.workshop.findUnique as jest.Mock
const mockUpsert = prisma.workshopInvite.upsert as jest.Mock
const mockFindMany = prisma.workshopInvite.findMany as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/workshop/invites', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const adminSession = {
  user: { id: 'admin1', name: 'Ana', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}
const staffSession = {
  user: { id: 'staff1', name: 'Beto', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
}

describe('POST /api/workshop/invites', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(staffSession)
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when email is missing', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the target email belongs to an OWNER', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'OWNER', workshopId: null })
    const res = await POST(makeRequest({ email: 'owner@test.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when the target is a mechanic already in a workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'MECHANIC', workshopId: 'ws-other' })
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(409)
  })

  it('returns 500 and does not persist an invite when the email fails to send', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue(null)
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockRejectedValue(new Error('bounced'))
    const res = await POST(makeRequest({ email: 'new@test.com' }))
    expect(res.status).toBe(500)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('sends the email and upserts the invite for an unregistered email', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue(null)
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockResolvedValue(undefined)
    mockUpsert.mockResolvedValue({ id: 'inv1', email: 'new@test.com', expiresAt: new Date() })

    const res = await POST(makeRequest({ email: 'New@Test.com' }))
    expect(res.status).toBe(201)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@test.com', workshopName: 'AutoShop', inviterName: 'Ana' })
    )
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workshopId_email: { workshopId: 'ws1', email: 'new@test.com' } },
      })
    )
  })

  it('allows re-inviting a mechanic with no workshop yet', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'MECHANIC', workshopId: null })
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockResolvedValue(undefined)
    mockUpsert.mockResolvedValue({ id: 'inv2', email: 'free@test.com', expiresAt: new Date() })

    const res = await POST(makeRequest({ email: 'free@test.com' }))
    expect(res.status).toBe(201)
  })
})

describe('GET /api/workshop/invites', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(staffSession)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists pending invites for the workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindMany.mockResolvedValue([{ id: 'inv1', email: 'a@test.com' }])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workshopId: 'ws1', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, createdAt: true, expiresAt: true },
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/workshop-invites.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/workshop/invites/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/workshop/invites/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWorkshopInviteEmail } from '@/lib/email'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  const normalizedEmail = email.toLowerCase().trim()

  const targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (targetUser?.role === 'OWNER') {
    return NextResponse.json({ error: 'Ese correo pertenece a un dueño' }, { status: 400 })
  }
  if (targetUser?.role === 'MECHANIC' && targetUser.workshopId) {
    return NextResponse.json({ error: 'Ese mecánico ya pertenece a un taller' }, { status: 409 })
  }

  const workshop = await prisma.workshop.findUnique({
    where: { id: session.user.workshopId! },
    select: { name: true },
  })
  const token = randomBytes(32).toString('hex')
  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

  try {
    await sendWorkshopInviteEmail({
      to: normalizedEmail,
      workshopName: workshop!.name,
      inviterName: session.user.name ?? 'Un administrador',
      acceptUrl,
    })
  } catch {
    return NextResponse.json({ error: 'No se pudo enviar la invitación' }, { status: 500 })
  }

  const invite = await prisma.workshopInvite.upsert({
    where: { workshopId_email: { workshopId: session.user.workshopId!, email: normalizedEmail } },
    create: {
      workshopId: session.user.workshopId!,
      email: normalizedEmail,
      token,
      status: 'PENDING',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    update: {
      token,
      status: 'PENDING',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  })

  return NextResponse.json({ id: invite.id, email: invite.email, expiresAt: invite.expiresAt }, { status: 201 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invites = await prisma.workshopInvite.findMany({
    where: { workshopId: session.user.workshopId!, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  })
  return NextResponse.json(invites)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/workshop-invites.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/workshop/invites/route.ts __tests__/api/workshop-invites.test.ts
git commit -m "feat: add POST/GET /api/workshop/invites"
```

---

### Task 7: Cancel an invite — `DELETE /api/workshop/invites/[id]`

**Files:**
- Create: `app/api/workshop/invites/[id]/route.ts`
- Test: `__tests__/api/workshop-invites-cancel.test.ts`

**Interfaces:**
- Consumes: `session.user.workshopRole` (Task 2)
- Produces: `DELETE /api/workshop/invites/[id]` → `204` on success, sets the invite's status to `CANCELLED`.

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/api/workshop-invites-cancel.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshopInvite: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

import { DELETE } from '@/app/api/workshop/invites/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.workshopInvite.findUnique as jest.Mock
const mockUpdate = prisma.workshopInvite.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/workshop/invites/inv1', { method: 'DELETE' })
}

const params = Promise.resolve({ id: 'inv1' })
const adminSession = {
  user: { id: 'admin1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}

describe('DELETE /api/workshop/invites/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the invite does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it("returns 404 when the invite belongs to a different workshop", async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'inv1', workshopId: 'ws-other' })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('cancels the invite and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'inv1', workshopId: 'ws1' })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { status: 'CANCELLED' } })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/workshop-invites-cancel.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/workshop/invites/[id]/route'`

- [ ] **Step 3: Implement the route**

```ts
// app/api/workshop/invites/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const invite = await prisma.workshopInvite.findUnique({ where: { id } })
  if (!invite || invite.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  await prisma.workshopInvite.update({ where: { id }, data: { status: 'CANCELLED' } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/workshop-invites-cancel.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/workshop/invites/[id]/route.ts __tests__/api/workshop-invites-cancel.test.ts
git commit -m "feat: add DELETE /api/workshop/invites/[id]"
```

---

### Task 8: Roster — `GET /api/workshop/team`, `DELETE /api/workshop/team/[userId]`

**Files:**
- Create: `app/api/workshop/team/route.ts`
- Create: `app/api/workshop/team/[userId]/route.ts`
- Test: `__tests__/api/workshop-team.test.ts`
- Test: `__tests__/api/workshop-team-remove.test.ts`

**Interfaces:**
- Consumes: `session.user.workshopRole` (Task 2)
- Produces: `GET /api/workshop/team` → `200` with `{ id, name, email, workshopRole }[]` for every mechanic in the caller's workshop. `DELETE /api/workshop/team/[userId]` → `204`, clears the target's `workshopId`/`workshopRole`.

- [ ] **Step 1: Write the failing tests for `GET`**

```ts
// __tests__/api/workshop-team.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: jest.fn() } },
}))

import { GET } from '@/app/api/workshop/team/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindMany = prisma.user.findMany as jest.Mock

describe('GET /api/workshop/team', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 for an owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic with no workshop', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: null } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists mechanics in the caller workshop for STAFF too', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    mockFindMany.mockResolvedValue([{ id: 'a1', name: 'Ana', email: 'ana@test.com', workshopRole: 'ADMIN' }])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workshopId: 'ws1' },
      select: { id: true, name: true, email: true, workshopRole: true },
      orderBy: { createdAt: 'asc' },
    })
  })
})
```

- [ ] **Step 2: Run the `GET` test to verify it fails**

Run: `npx jest __tests__/api/workshop-team.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/workshop/team/route'`

- [ ] **Step 3: Implement `GET /api/workshop/team`**

```ts
// app/api/workshop/team/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mechanics = await prisma.user.findMany({
    where: { workshopId: session.user.workshopId },
    select: { id: true, name: true, email: true, workshopRole: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(mechanics)
}
```

- [ ] **Step 4: Run the `GET` test to verify it passes**

Run: `npx jest __tests__/api/workshop-team.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing tests for `DELETE`**

```ts
// __tests__/api/workshop-team-remove.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

import { DELETE } from '@/app/api/workshop/team/[userId]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockUpdate = prisma.user.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/workshop/team/staff1', { method: 'DELETE' })
}

const adminSession = {
  user: { id: 'admin1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}

describe('DELETE /api/workshop/team/[userId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff2', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 400 when the admin targets themself', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    const res = await DELETE(
      new Request('http://localhost/api/workshop/team/admin1', { method: 'DELETE' }),
      { params: Promise.resolve({ userId: 'admin1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when the target does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the target belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws-other', workshopRole: 'STAFF' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the target is another ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws1', workshopRole: 'ADMIN' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(400)
  })

  it('clears workshopId and workshopRole and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws1', workshopRole: 'STAFF' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'staff1' },
      data: { workshopId: null, workshopRole: null },
    })
  })
})
```

- [ ] **Step 6: Run the `DELETE` test to verify it fails**

Run: `npx jest __tests__/api/workshop-team-remove.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/workshop/team/[userId]/route'`

- [ ] **Step 7: Implement `DELETE /api/workshop/team/[userId]`**

```ts
// app/api/workshop/team/[userId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'No podés quitarte a vos mismo' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target || target.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 })
  }
  if (target.workshopRole === 'ADMIN') {
    return NextResponse.json({ error: 'No podés quitar a otro administrador' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: userId }, data: { workshopId: null, workshopRole: null } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 8: Run the `DELETE` test to verify it passes**

Run: `npx jest __tests__/api/workshop-team-remove.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 9: Commit**

```bash
git add app/api/workshop/team/route.ts app/api/workshop/team/[userId]/route.ts __tests__/api/workshop-team.test.ts __tests__/api/workshop-team-remove.test.ts
git commit -m "feat: add workshop roster GET and remove-mechanic DELETE"
```

---

### Task 9: Accept and decline an invite

**Files:**
- Create: `app/api/invites/[token]/accept/route.ts`
- Create: `app/api/invites/[token]/decline/route.ts`
- Test: `__tests__/api/invites-accept.test.ts`
- Test: `__tests__/api/invites-decline.test.ts`

**Interfaces:**
- Consumes: `getPendingInvite` (Task 5)
- Produces: `POST /api/invites/[token]/accept` → `200` with `{ workshopId }`, sets caller's `workshopId`/`workshopRole = 'STAFF'`, marks invite `ACCEPTED`. `POST /api/invites/[token]/decline` → `204`, marks invite `DECLINED`.

- [ ] **Step 1: Write the failing tests for accept**

```ts
// __tests__/api/invites-accept.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workshopInvite', () => ({ getPendingInvite: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: jest.fn() },
    workshopInvite: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST } from '@/app/api/invites/[token]/accept/route'
import { getServerSession } from 'next-auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetPendingInvite = getPendingInvite as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/invites/tok/accept', { method: 'POST' })
}
const params = Promise.resolve({ token: 'tok' })

const pendingInvite = { id: 'inv1', workshopId: 'ws1', email: 'mech@test.com' }
const mechanicSession = {
  user: { id: 'm1', role: 'MECHANIC', email: 'mech@test.com', workshopId: null },
}

describe('POST /api/invites/[token]/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 410 when the invite is not usable', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(410)
  })

  it('returns 403 when the caller is an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', email: 'mech@test.com', workshopId: null } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it("returns 403 when the caller's email does not match the invite", async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, email: 'other@test.com' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 409 when the caller already belongs to a workshop', async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, workshopId: 'ws-existing' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('joins the workshop as STAFF and marks the invite ACCEPTED', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workshopId).toBe('ws1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    expect(prisma.workshopInvite.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'ACCEPTED' },
    })
  })
})
```

- [ ] **Step 2: Run the accept test to verify it fails**

Run: `npx jest __tests__/api/invites-accept.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/invites/[token]/accept/route'`

- [ ] **Step 3: Implement the accept route**

```ts
// app/api/invites/[token]/accept/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPendingInvite } from '@/lib/workshopInvite'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await params
  const invite = await getPendingInvite(token)
  if (!invite) {
    return NextResponse.json({ error: 'Invitación no válida' }, { status: 410 })
  }
  if (session.user.role !== 'MECHANIC' || session.user.email !== invite.email) {
    return NextResponse.json({ error: 'Esta invitación es para otra cuenta' }, { status: 403 })
  }
  if (session.user.workshopId) {
    return NextResponse.json({ error: 'Ya pertenecés a un taller' }, { status: 409 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { workshopId: invite.workshopId, workshopRole: 'STAFF' },
    }),
    prisma.workshopInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } }),
  ])

  return NextResponse.json({ workshopId: invite.workshopId })
}
```

- [ ] **Step 4: Run the accept test to verify it passes**

Run: `npx jest __tests__/api/invites-accept.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Write the failing tests for decline**

```ts
// __tests__/api/invites-decline.test.ts
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workshopInvite', () => ({ getPendingInvite: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { workshopInvite: { update: jest.fn() } },
}))

import { POST } from '@/app/api/invites/[token]/decline/route'
import { getServerSession } from 'next-auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetPendingInvite = getPendingInvite as jest.Mock
const mockUpdate = prisma.workshopInvite.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/invites/tok/decline', { method: 'POST' })
}
const params = Promise.resolve({ token: 'tok' })

const pendingInvite = { id: 'inv1', workshopId: 'ws1', email: 'mech@test.com' }
const mechanicSession = {
  user: { id: 'm1', role: 'MECHANIC', email: 'mech@test.com', workshopId: null },
}

describe('POST /api/invites/[token]/decline', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 410 when the invite is not usable', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(410)
  })

  it("returns 403 when the caller's email does not match the invite", async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, email: 'other@test.com' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('marks the invite DECLINED and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { status: 'DECLINED' } })
  })
})
```

- [ ] **Step 6: Run the decline test to verify it fails**

Run: `npx jest __tests__/api/invites-decline.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/invites/[token]/decline/route'`

- [ ] **Step 7: Implement the decline route**

```ts
// app/api/invites/[token]/decline/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPendingInvite } from '@/lib/workshopInvite'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await params
  const invite = await getPendingInvite(token)
  if (!invite) {
    return NextResponse.json({ error: 'Invitación no válida' }, { status: 410 })
  }
  if (session.user.role !== 'MECHANIC' || session.user.email !== invite.email) {
    return NextResponse.json({ error: 'Esta invitación es para otra cuenta' }, { status: 403 })
  }

  await prisma.workshopInvite.update({ where: { id: invite.id }, data: { status: 'DECLINED' } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 8: Run the decline test to verify it passes**

Run: `npx jest __tests__/api/invites-decline.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 9: Commit**

```bash
git add app/api/invites __tests__/api/invites-accept.test.ts __tests__/api/invites-decline.test.ts
git commit -m "feat: add invite accept/decline routes"
```

---

### Task 10: Invite landing page — `/invite/[token]`

**Files:**
- Create: `app/invite/[token]/page.tsx`
- Create: `app/invite/[token]/InviteActions.tsx`

**Interfaces:**
- Consumes: `getPendingInvite` (Task 5), `POST /api/invites/[token]/accept` and `/decline` (Task 9)
- Produces: a page at `/invite/[token]` covering every state described in the spec (no session, wrong account, already in a workshop, expired/resolved, or ready to accept/decline).

- [ ] **Step 1: Implement the accept/decline client component**

```tsx
// app/invite/[token]/InviteActions.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'

export function InviteActions({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function respond(action: 'accept' | 'decline') {
    setError(null)
    setLoading(action)
    const res = await fetch(`/api/invites/${token}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Algo salió mal')
      setLoading(null)
      return
    }
    router.push('/mechanic')
    router.refresh()
  }

  return (
    <div className="bezel">
      <div className="bezel-core flex flex-col gap-4 p-8">
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
          >
            {error}
          </p>
        )}
        <Button onClick={() => respond('accept')} disabled={loading !== null} size="lg" className="w-full">
          {loading === 'accept' ? 'Aceptando…' : 'Aceptar invitación'}
          <ButtonIconIsland>
            <CheckIcon className="size-3.5" />
          </ButtonIconIsland>
        </Button>
        <Button
          onClick={() => respond('decline')}
          variant="secondary"
          disabled={loading !== null}
          size="lg"
          className="w-full"
        >
          {loading === 'decline' ? 'Rechazando…' : 'Rechazar'}
          <ButtonIconIsland>
            <CloseIcon className="size-3.5" />
          </ButtonIconIsland>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement the page**

```tsx
// app/invite/[token]/page.tsx
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button } from '@/components/ui/button'
import { InviteActions } from './InviteActions'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [session, invite] = await Promise.all([getServerSession(authOptions), getPendingInvite(token)])

  if (!invite) {
    return (
      <AuthShell
        eyebrow="Invitación"
        headline="Esta invitación ya no es válida."
        sub="Pedile a tu taller que te envíe una nueva."
      >
        <div className="bezel">
          <div className="bezel-core flex flex-col items-center gap-4 p-8 text-center">
            <Button asChild variant="secondary">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  if (!session) {
    return (
      <AuthShell
        eyebrow="Invitación"
        headline={`Te invitaron a unirte a ${invite.workshop.name}`}
        sub="Iniciá sesión o creá una cuenta para aceptar."
      >
        <div className="bezel">
          <div className="bezel-core flex flex-col gap-4 p-8">
            <Button asChild size="lg" className="w-full">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>Iniciar sesión</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="w-full">
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite.email)}&role=MECHANIC`}
              >
                Crear cuenta
              </Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  const emailMismatch = session.user.role !== 'MECHANIC' || session.user.email !== invite.email
  const alreadyInWorkshop = !emailMismatch && session.user.workshopId !== null

  if (emailMismatch || alreadyInWorkshop) {
    return (
      <AuthShell
        eyebrow="Invitación"
        headline={emailMismatch ? 'Esta invitación es para otra cuenta' : 'Ya pertenecés a un taller'}
        sub={
          emailMismatch
            ? `Iniciá sesión con ${invite.email} para aceptarla.`
            : 'Salí de tu taller actual antes de aceptar una nueva invitación.'
        }
      >
        <div className="bezel">
          <div className="bezel-core p-8 text-center">
            <Button asChild variant="secondary">
              <Link href="/mechanic">Ir a mi panel</Link>
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Invitación"
      headline={`Te invitaron a unirte a ${invite.workshop.name}`}
      sub={invite.workshop.address}
    >
      <InviteActions token={token} />
    </AuthShell>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/invite
git commit -m "feat: add invite landing page with accept/decline"
```

---

### Task 11: Auth passthrough — register, select-role, and login honor invite links

**Files:**
- Modify: `app/(auth)/register/page.tsx`
- Modify: `app/(auth)/select-role/page.tsx`
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: the `/invite/[token]` URL shape (Task 10) — links to `/register?callbackUrl=...&email=...&role=MECHANIC` and `/login?callbackUrl=...`
- Produces: `/register` pre-fills and locks the email field when `?role=MECHANIC` is present, and forwards `callbackUrl`/`lockedRole` into `sessionStorage`; `/select-role` skips the role picker when a locked role is present and redirects to `callbackUrl` after registering; `/login` redirects to `callbackUrl` after signing in.

- [ ] **Step 1: Update `app/(auth)/login/page.tsx` to honor `callbackUrl`**

Replace the full contents of `app/(auth)/login/page.tsx`:

```tsx
// app/(auth)/login/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Email o contraseña incorrectos')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <AuthShell
      eyebrow="Plataforma de servicio vehicular"
      headline="La bitácora completa de tu vehículo."
      sub="Historial de reparaciones, mantenimiento y turnos — compartido entre dueños y talleres, siempre al día."
    >
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-7 p-8 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-foreground">
              Iniciá sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Entrá para gestionar tus vehículos y turnos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate={false}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="email" className={labelClass}>
                Correo electrónico
              </Label>
              <div className="group relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
                  <MailIcon />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="usuario@ejemplo.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="password" className={labelClass}>
                Contraseña
              </Label>
              <div className="group relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
                  <LockIcon />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              {!loading && (
                <ButtonIconIsland>
                  <ArrowRightIcon className="size-3.5" />
                </ButtonIconIsland>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
```

- [ ] **Step 2: Update `app/(auth)/register/page.tsx` to prefill/lock email and forward invite params**

Replace the full contents of `app/(auth)/register/page.tsx`:

```tsx
// app/(auth)/register/page.tsx
'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'
const iconClass =
  'pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') ?? ''
  const lockedRole = searchParams.get('role') === 'MECHANIC' ? 'MECHANIC' : null
  const callbackUrl = searchParams.get('callbackUrl')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!acceptedTerms) {
      setError('Tenés que aceptar los términos para continuar')
      return
    }

    sessionStorage.setItem('reg_pending', JSON.stringify({ name, email, password, lockedRole, callbackUrl }))
    router.push('/select-role')
  }

  return (
    <AuthShell
      eyebrow="Creá tu cuenta"
      headline="Empezá tu registro de servicio."
      sub="En menos de un minuto tenés tu cuenta lista — para registrar tu vehículo o poner tu taller en el mapa."
    >
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-7 p-8 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-foreground">
              Crear cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              {lockedRole ? 'Paso 1 de 2 — tus datos para unirte al taller.' : 'Paso 1 de 2 — tus datos.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  role="alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="name" className={labelClass}>
                Nombre completo
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <UserIcon />
                </span>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Juan Pérez"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="email" className={labelClass}>
                Correo electrónico
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <MailIcon />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vos@ejemplo.com"
                  defaultValue={prefillEmail}
                  readOnly={lockedRole !== null}
                  className="pl-10"
                />
              </div>
              {lockedRole && (
                <span className="text-xs text-muted-foreground">Este correo viene de tu invitación.</span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="password" className={labelClass}>
                Contraseña
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <LockIcon />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres"
                  className="pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="confirm" className={labelClass}>
                Confirmar contraseña
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <LockIcon />
                </span>
                <Input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repetí tu contraseña"
                  className="pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 select-none">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={checked => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                Acepto los términos del servicio y la política de privacidad de VetCar.
              </span>
            </label>

            <Button type="submit" size="lg" className="mt-1 w-full">
              Continuar
              <ButtonIconIsland>
                <ArrowRightIcon className="size-3.5" />
              </ButtonIconIsland>
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
```

- [ ] **Step 3: Update `app/(auth)/select-role/page.tsx` to skip the picker for a locked role and honor `callbackUrl`**

Replace the full contents of `app/(auth)/select-role/page.tsx`:

```tsx
// app/(auth)/select-role/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, CheckIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Logo } from '@/components/shared/Logo'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Role = 'MECHANIC' | 'OWNER'

const ROLE_OPTIONS: {
  role: Role
  icon: typeof WrenchIcon
  title: string
  description: string
}[] = [
  {
    role: 'MECHANIC',
    icon: WrenchIcon,
    title: 'Mecánico / Taller',
    description: 'Poné tu taller en el mapa, definí horarios y recibí turnos de tus clientes.',
  },
  {
    role: 'OWNER',
    icon: CarIcon,
    title: 'Dueño de vehículo',
    description: 'Registrá tus vehículos, seguí su historial y agendá turnos en talleres cercanos.',
  },
]

export default function SelectRolePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [lockedRole, setLockedRole] = useState<Role | null>(null)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('reg_pending')
    if (!raw) return
    const pending = JSON.parse(raw) as { lockedRole?: Role | null; callbackUrl?: string | null }
    if (pending.lockedRole) {
      setLockedRole(pending.lockedRole)
      setSelected(pending.lockedRole)
    }
    if (pending.callbackUrl) setCallbackUrl(pending.callbackUrl)
  }, [])

  async function handleContinue() {
    if (!selected) return

    const raw = sessionStorage.getItem('reg_pending')
    if (!raw) {
      router.replace('/register')
      return
    }

    setError('')
    setLoading(true)

    const { name, email, password } = JSON.parse(raw) as { name: string; email: string; password: string }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: selected }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'El registro falló')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('reg_pending')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Cuenta creada, pero el inicio de sesión falló. Por favor, iniciá sesión manualmente.')
      router.push('/login')
      return
    }

    router.push(callbackUrl ?? '/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: motionTokens.easing.fluid }}
          className="flex w-full max-w-[640px] flex-col items-center gap-10"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo className="text-xl" />
            <div className="flex flex-col items-center gap-4">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Último paso
              </span>
              <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-5xl">
                {lockedRole ? 'Vas a unirte como mecánico.' : '¿Cómo vas a usar VetCar?'}
              </h1>
              <p className="max-w-md text-base text-muted-foreground">
                {lockedRole
                  ? 'Tu invitación ya define tu rol — completá el registro para unirte al taller.'
                  : 'Elegí tu rol para completar el registro. Esto define tu panel y tus herramientas.'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {!lockedRole && (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Rol">
              {ROLE_OPTIONS.map(({ role, icon: RoleIcon, title, description }, i) => {
                const isSelected = selected === role
                return (
                  <motion.button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelected(role)}
                    initial={{ opacity: 0, y: motionTokens.distance.md }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: motionTokens.easing.fluid, delay: 0.15 + i * 0.08 }}
                    whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    className={cn(
                      'bezel cursor-pointer text-left outline-none transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/40',
                      isSelected && 'shadow-[0_0_0_1px_rgba(242,179,80,0.45),0_20px_50px_-20px_rgba(242,179,80,0.25)]'
                    )}
                  >
                    <div className="bezel-core relative flex h-full flex-col gap-5 p-7">
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            'flex size-12 items-center justify-center rounded-full ring-1 transition-colors duration-500',
                            isSelected
                              ? 'bg-primary/15 text-primary ring-primary/30'
                              : 'bg-white/[0.05] text-muted-foreground ring-white/[0.08]'
                          )}
                        >
                          <RoleIcon className="size-5" />
                        </span>
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full ring-1 transition-all duration-500',
                            isSelected
                              ? 'bg-primary text-primary-foreground ring-primary/50'
                              : 'bg-transparent text-transparent ring-white/[0.12]'
                          )}
                          aria-hidden="true"
                        >
                          <CheckIcon className="size-3.5" strokeWidth={2} />
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                          {title}
                        </span>
                        <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selected || loading}
            size="lg"
            className="w-full sm:w-auto sm:min-w-72"
          >
            {loading ? 'Creando cuenta…' : 'Completar registro'}
            {!loading && (
              <ButtonIconIsland>
                <ArrowRightIcon className="size-3.5" />
              </ButtonIconIsland>
            )}
          </Button>

          <p className="text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <a
              href="/login"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Iniciá sesión
            </a>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/login/page.tsx app/(auth)/register/page.tsx app/(auth)/select-role/page.tsx
git commit -m "feat: honor invite callbackUrl and locked role through registration"
```

---

### Task 12: "Equipo" page — roster, invite dialog, remove, pending invites

**Files:**
- Modify: `components/ui/icons.tsx` (add `TrashIcon`, `UserPlusIcon`)
- Modify: `app/(dashboard)/mechanic/nav-items.ts`
- Create: `app/(dashboard)/mechanic/team/page.tsx`
- Create: `app/(dashboard)/mechanic/team/TeamRoster.tsx`

**Interfaces:**
- Consumes: `POST /api/workshop/invites`, `DELETE /api/workshop/invites/[id]` (Tasks 6–7), `DELETE /api/workshop/team/[userId]` (Task 8)
- Produces: `/mechanic/team` page; `TeamRoster({ currentUserId, isAdmin, mechanics, pendingInvites }: TeamRosterProps)` where
  ```ts
  type Mechanic = { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' }
  type PendingInvite = { id: string; email: string; createdAt: string; expiresAt: string }
  interface TeamRosterProps {
    currentUserId: string
    isAdmin: boolean
    mechanics: Mechanic[]
    pendingInvites: PendingInvite[]
  }
  ```

- [ ] **Step 1: Add `TrashIcon` and `UserPlusIcon`**

In `components/ui/icons.tsx`, add after `LogOutIcon`:

```tsx
export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M7 7l1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" />
    </Icon>
  )
}

export function UserPlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M3 20.5a7 7 0 0 1 14 0" />
      <path d="M19 8v6M16 11h6" />
    </Icon>
  )
}
```

- [ ] **Step 2: Add the "Equipo" nav item**

Replace the full contents of `app/(dashboard)/mechanic/nav-items.ts`:

```ts
import type { DashboardNavItem } from '@/components/shared/DashboardNav'

export const MECHANIC_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/mechanic', label: 'Panel' },
  { key: 'vehicles', href: '/mechanic/vehicles', label: 'Vehículos' },
  { key: 'team', href: '/mechanic/team', label: 'Equipo' },
  { key: 'settings', href: '/mechanic/settings', label: 'Configuración' },
]
```

- [ ] **Step 3: Implement `TeamRoster.tsx`**

```tsx
// app/(dashboard)/mechanic/team/TeamRoster.tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPlusIcon, TrashIcon, MailIcon, CloseIcon } from '@/components/ui/icons'
import { getInitials } from '@/lib/utils'

type Mechanic = { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' }
type PendingInvite = { id: string; email: string; createdAt: string; expiresAt: string }

interface TeamRosterProps {
  currentUserId: string
  isAdmin: boolean
  mechanics: Mechanic[]
  pendingInvites: PendingInvite[]
}

const sectionLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'
const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })

export function TeamRoster({ currentUserId, isAdmin, mechanics, pendingInvites }: TeamRosterProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSubmitting(true)
    try {
      const res = await fetch('/api/workshop/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        setInviteError(data.error ?? 'No se pudo enviar la invitación')
        return
      }
      setInviteOpen(false)
      setInviteEmail('')
      router.refresh()
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId)
    try {
      await fetch(`/api/workshop/team/${userId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setRemovingId(null)
    }
  }

  async function handleCancelInvite(id: string) {
    setCancelingId(id)
    try {
      await fetch(`/api/workshop/invites/${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-1">
          <h2 className={sectionLabel}>Mecánicos</h2>
          {isAdmin && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              Invitar mecánico
              <ButtonIconIsland>
                <UserPlusIcon className="size-3.5" />
              </ButtonIconIsland>
            </Button>
          )}
        </div>
        <div className="bezel">
          <div className="bezel-core flex flex-col">
            {mechanics.map(m => (
              <div key={m.id} className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0">
                <Avatar className="size-10 bg-white/[0.06]">
                  <AvatarFallback className="bg-white/[0.06] font-mono text-xs font-semibold text-primary">
                    {getInitials(m.name ?? m.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">{m.name ?? m.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                </div>
                <Badge variant={m.role === 'ADMIN' ? 'active' : 'idle'}>
                  {m.role === 'ADMIN' ? 'Admin' : 'Staff'}
                </Badge>
                {isAdmin && m.role !== 'ADMIN' && m.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={removingId === m.id}
                    onClick={() => handleRemove(m.id)}
                    aria-label={`Quitar a ${m.name ?? m.email}`}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-5">
          <h2 className={`${sectionLabel} px-1`}>Invitaciones pendientes</h2>
          {pendingInvites.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
          ) : (
            <div className="bezel">
              <div className="bezel-core flex flex-col">
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                      <MailIcon className="size-4" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium text-foreground">{invite.email}</span>
                      <span className="text-xs text-muted-foreground">
                        Vence el {DATE_FORMATTER.format(new Date(invite.expiresAt))}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={cancelingId === invite.id}
                      onClick={() => handleCancelInvite(invite.id)}
                      aria-label={`Cancelar invitación a ${invite.email}`}
                    >
                      <CloseIcon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar mecánico</DialogTitle>
            <DialogDescription>Le enviamos un correo con un enlace para unirse a tu taller.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            {inviteError && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
              >
                {inviteError}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Correo electrónico</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="mecanico@ejemplo.com"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? 'Enviando…' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Implement the page**

```tsx
// app/(dashboard)/mechanic/team/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserImage } from '@/lib/user'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { MECHANIC_NAV_ITEMS } from '../nav-items'
import { TeamRoster } from './TeamRoster'

export default async function MechanicTeamPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (!session.user.workshopId) redirect('/workshop/setup')

  const isAdmin = session.user.workshopRole === 'ADMIN'

  const [mechanics, pendingInvites, userImage] = await Promise.all([
    prisma.user.findMany({
      where: { workshopId: session.user.workshopId },
      select: { id: true, name: true, email: true, workshopRole: true },
      orderBy: { createdAt: 'asc' },
    }),
    isAdmin
      ? prisma.workshopInvite.findMany({
          where: { workshopId: session.user.workshopId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, createdAt: true, expiresAt: true },
        })
      : Promise.resolve([]),
    getUserImage(session.user.id),
  ])

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        items={MECHANIC_NAV_ITEMS}
        active="team"
        userName={session.user.name ?? 'mecánico'}
        userEmail={session.user.email ?? undefined}
        userImage={userImage}
        profileHref={null}
      />
      <main className="flex-1 px-4 pt-32 sm:px-8 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="eyebrow">
              <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
              Equipo
            </span>
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
              Tu equipo de mecánicos.
            </h1>
          </div>
          <TeamRoster
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            mechanics={mechanics.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.workshopRole! }))}
            pendingInvites={pendingInvites.map(i => ({
              id: i.id,
              email: i.email,
              createdAt: i.createdAt.toISOString(),
              expiresAt: i.expiresAt.toISOString(),
            }))}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/ui/icons.tsx app/(dashboard)/mechanic/nav-items.ts app/(dashboard)/mechanic/team
git commit -m "feat: add mechanic team page with roster, invite, and remove"
```

---

### Task 13: Restrict `/mechanic/settings` to ADMIN

**Files:**
- Modify: `app/(dashboard)/mechanic/settings/page.tsx`

**Interfaces:**
- Consumes: `session.user.workshopRole` (Task 2)
- Produces: `STAFF` visiting `/mechanic/settings` directly is redirected to `/mechanic`.

- [ ] **Step 1: Add the guard**

In `app/(dashboard)/mechanic/settings/page.tsx`, add a line right after the existing `if (!session.user.workshopId) redirect('/workshop/setup')` check:

```ts
  if (session.user.workshopRole !== 'ADMIN') redirect('/mechanic')
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/mechanic/settings/page.tsx
git commit -m "feat: restrict workshop settings page to ADMIN"
```

---

### Final check

- [ ] **Run the full test suite**

Run: `npm test`
Expected: all suites pass, including every new file added in Tasks 1–13.

- [ ] **Run the linter**

Run: `npm run lint`
Expected: no errors.

- [ ] **Run the type checker**

Run: `npx tsc --noEmit`
Expected: no errors.
