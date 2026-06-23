# Phase 1 — Auth & Workshop Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement split registration (Owner vs Mechanic), JWT sessions with `workshopId`, workshop creation flow, and centralized route protection via `proxy.ts`.

**Architecture:** `proxy.ts` (Next.js 16 replacement for `middleware.ts`) handles all route protection centrally using `getToken` from `next-auth/jwt` — no DB call on every request. Server components use `getServerSession(authOptions)` for SSR. Client forms use `signIn`/`useSession` from `next-auth/react` (requires `SessionProvider` wrapper). After workshop creation, `useSession().update()` triggers `jwt` callback with `trigger:'update'` to re-read `workshopId` from DB and refresh the cookie.

**Tech Stack:** Next.js 16 (App Router), NextAuth v4.24, Prisma v7, `next-auth/jwt` `getToken`, `bcryptjs`, `next/jest` + Jest for API route unit tests.

## Global Constraints

- `proxy.ts` in project root — function named `proxy` (not `middleware`); `middleware.ts` is deprecated in Next.js 16
- `getServerSession(authOptions)` called with one argument in server components and route handlers; NextAuth v4.24 already `await`s `cookies()`/`headers()` internally
- `cookies()` and `headers()` from `next/headers` are async in Next.js 16 — `await` them
- `@/` path alias maps to project root (`tsconfig.json` paths: `"@/*": ["./*"]`)
- Owner → ClientProfile auto-link is intentionally deferred to Phase 2 (no `ClientProfile` model exists yet)
- JWT payload: `{ id, role, workshopId }` — available on every server request without extra DB calls
- Docker must be running before any `prisma migrate` command: `docker compose up -d`
- `DATABASE_URL` must be set in `.env.local` before running migrations

---

### Task 1: Test Infrastructure

**Files:**
- Create: `jest.config.js`
- Modify: `package.json`
- Create: `__tests__/sanity.test.ts`

**Interfaces:**
- Produces: `npm test` command that runs all `__tests__/**/*.test.ts` files

- [ ] **Step 1: Install Jest dependencies**

```bash
npm install --save-dev jest @types/jest
```

Expected: packages added to `devDependencies` in `package.json`, `node_modules/jest` present.

- [ ] **Step 2: Create `jest.config.js`**

```js
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

In `package.json`, add to the `"scripts"` object:

```json
"test": "jest",
"test:watch": "jest --watch"
```

The scripts block becomes:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

- [ ] **Step 4: Write sanity test**

```typescript
// __tests__/sanity.test.ts
describe('sanity', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run tests to verify setup**

```bash
npm test
```

Expected output:
```
PASS __tests__/sanity.test.ts
  sanity
    ✓ runs tests

Tests: 1 passed, 1 total
```

- [ ] **Step 6: Commit**

```bash
git add jest.config.js package.json __tests__/sanity.test.ts
git commit -m "chore: add Jest test infrastructure"
```

---

### Task 2: Schema Migration — Workshop Model + User.workshopId

**Files:**
- Modify: `prisma/schema.prisma`
- Produces: new migration in `prisma/migrations/`, updated Prisma client

**Interfaces:**
- Produces: `prisma.workshop.create(...)`, `prisma.user.update({ data: { workshopId } })`, `user.workshopId` scalar field on Prisma `User` type

**Preconditions:** Docker is running (`docker compose up -d`), `.env.local` has `DATABASE_URL`.

- [ ] **Step 1: Add `Workshop` model and `workshopId` to `User` in `prisma/schema.prisma`**

Replace the entire `User` model block with:
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          Role      @default(OWNER)
  workshopId    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  workshop   Workshop?   @relation(fields: [workshopId], references: [id])
  accounts   Account[]
  sessions   Session[]
  vehicles   Vehicle[]   @relation("VehicleOwner")
  workOrders WorkOrder[] @relation("MechanicWorkOrders")
}
```

Add the `Workshop` model after the `User` model:
```prisma
model Workshop {
  id        String   @id @default(cuid())
  name      String
  address   String
  phone     String
  email     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  mechanics User[]
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-workshop
```

Expected: migration file created at `prisma/migrations/<timestamp>_add_workshop/migration.sql`, database updated.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Prisma client regenerated, `User` type now includes `workshopId: string | null`, `Workshop` type available.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Workshop model and User.workshopId"
```

---

### Task 3: Types + Auth JWT Update

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/auth.ts`

**Interfaces:**
- Produces: `session.user.workshopId: string | null | undefined` available in server components and route handlers
- Produces: `token.workshopId: string | null | undefined` in JWT callbacks
- Consumes: Prisma `User.workshopId` (from Task 2)

- [ ] **Step 1: Update `types/index.ts` to add `workshopId`**

Replace the entire file with:
```typescript
import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    workshopId?: string | null
  }

  interface Session {
    user: {
      id: string
      role: Role
      workshopId?: string | null
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
    workshopId?: string | null
  }
}
```

- [ ] **Step 2: Update `lib/auth.ts` to include `workshopId` in JWT and handle session refresh**

Replace the entire file with:
```typescript
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return user
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.workshopId = user.workshopId ?? null
      }
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id } })
        if (dbUser) token.workshopId = dbUser.workshopId ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.workshopId = token.workshopId ?? null
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No TypeScript errors related to `workshopId`. (Build may fail for other reasons — only care about type errors in `types/index.ts` and `lib/auth.ts`.)

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/auth.ts
git commit -m "feat: add workshopId to JWT and session types"
```

---

### Task 4: SessionProvider Wrapper

**Files:**
- Create: `components/shared/SessionProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `useSession()` available in any client component in the app tree
- Required by: Workshop setup form (`useSession().update()`)

- [ ] **Step 1: Create `components/shared/SessionProvider.tsx`**

```typescript
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

- [ ] **Step 2: Update `app/layout.tsx` to wrap with SessionProvider**

Replace the entire file with:
```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/shared/SessionProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'vet-car',
  description: 'Vehicle service history platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/shared/SessionProvider.tsx app/layout.tsx
git commit -m "feat: add NextAuth SessionProvider to root layout"
```

---

### Task 5: Register API Route (TDD)

**Files:**
- Create: `__tests__/api/register.test.ts`
- Create: `app/api/auth/register/route.ts`

**Interfaces:**
- Consumes: `prisma.user.findUnique`, `prisma.user.create`, `bcrypt.hash`
- Produces: `POST /api/auth/register` — body `{ name, email, password, role: 'OWNER'|'MECHANIC' }` → `201 { id, name, email, role }` or error

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/api/register.test.ts

const mockFindUnique = jest.fn()
const mockCreate = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))

import { POST } from '@/app/api/auth/register/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when fields are missing', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 when role is invalid', async () => {
    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com', password: 'pass1234', role: 'ADMIN' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid role')
  })

  it('returns 409 when email already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })
    const res = await POST(makeRequest({ name: 'Test', email: 'exists@test.com', password: 'pass1234', role: 'OWNER' }))
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('Email already in use')
  })

  it('creates OWNER user and returns 201', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'user-1', name: 'Test', email: 'test@test.com', role: 'OWNER' })

    const res = await POST(makeRequest({ name: 'Test', email: 'test@test.com', password: 'pass1234', role: 'OWNER' }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Test', email: 'test@test.com', password: 'hashed_password', role: 'OWNER' },
      select: { id: true, email: true, role: true, name: true },
    })
    const data = await res.json()
    expect(data.role).toBe('OWNER')
  })

  it('creates MECHANIC user and returns 201', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'user-2', name: 'Mech', email: 'mech@test.com', role: 'MECHANIC' })

    const res = await POST(makeRequest({ name: 'Mech', email: 'mech@test.com', password: 'pass1234', role: 'MECHANIC' }))
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Mech', email: 'mech@test.com', password: 'hashed_password', role: 'MECHANIC' },
      select: { id: true, email: true, role: true, name: true },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/register.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/auth/register/route'"

- [ ] **Step 3: Create `app/api/auth/register/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['OWNER', 'MECHANIC'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
      select: { id: true, email: true, role: true, name: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/api/register.test.ts
```

Expected:
```
PASS __tests__/api/register.test.ts
  POST /api/auth/register
    ✓ returns 400 when fields are missing
    ✓ returns 400 when role is invalid
    ✓ returns 409 when email already exists
    ✓ creates OWNER user and returns 201
    ✓ creates MECHANIC user and returns 201

Tests: 5 passed, 5 total
```

- [ ] **Step 5: Commit**

```bash
git add __tests__/api/register.test.ts app/api/auth/register/route.ts
git commit -m "feat: add registration API route with tests"
```

---

### Task 6: Workshop API Route (TDD)

**Files:**
- Create: `__tests__/api/workshop.test.ts`
- Create: `app/api/workshop/route.ts`

**Interfaces:**
- Consumes: `getServerSession(authOptions)`, `prisma.workshop.create`, `prisma.user.update`
- Produces: `POST /api/workshop` — requires MECHANIC session with no workshopId; body `{ name, address, phone, email }` → `201 { id, name, address, phone, email }` or error

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/api/workshop.test.ts

const mockGetServerSession = jest.fn()
jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

const mockWorkshopCreate = jest.fn()
const mockUserUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshop: { create: mockWorkshopCreate },
    user: { update: mockUserUpdate },
  },
}))

import { POST } from '@/app/api/workshop/route'

function makeRequest(body: object) {
  return new Request('http://localhost/api/workshop', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' }

describe('POST /api/workshop', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not a mechanic', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 409 when workshop already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: 'ws-existing' } })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest({ name: 'AutoShop' }))
    expect(res.status).toBe(400)
  })

  it('creates workshop, updates user, and returns 201', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1', ...validBody })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' },
    })
    expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { workshopId: 'ws-1' } })
    const data = await res.json()
    expect(data.id).toBe('ws-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- __tests__/api/workshop.test.ts
```

Expected: FAIL — "Cannot find module '@/app/api/workshop/route'"

- [ ] **Step 3: Create `app/api/workshop/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MECHANIC') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.workshopId) {
    return NextResponse.json({ error: 'Workshop already set up' }, { status: 409 })
  }

  try {
    const { name, address, phone, email } = await request.json()

    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workshop = await prisma.workshop.create({
      data: { name, address, phone, email },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { workshopId: workshop.id },
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- __tests__/api/workshop.test.ts
```

Expected:
```
PASS __tests__/api/workshop.test.ts
  POST /api/workshop
    ✓ returns 401 when not authenticated
    ✓ returns 401 when user is not a mechanic
    ✓ returns 409 when workshop already exists
    ✓ returns 400 when required fields are missing
    ✓ creates workshop, updates user, and returns 201

Tests: 5 passed, 5 total
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All 6 tests pass (1 sanity + 5 register + 5 workshop = 11 total — adjust count if sanity is included).

- [ ] **Step 6: Commit**

```bash
git add __tests__/api/workshop.test.ts app/api/workshop/route.ts
git commit -m "feat: add workshop creation API route with tests"
```

---

### Task 7: proxy.ts — Centralized Route Protection

**Files:**
- Create: `proxy.ts` (project root, alongside `app/`)

**Interfaces:**
- Consumes: `getToken` from `next-auth/jwt` — reads JWT from `next-auth.session-token` cookie, returns `{ id, role, workshopId }` or `null` without a DB call
- Produces: auth redirects for all page routes; API routes excluded from proxy

Note: Next.js v16 renamed `middleware.ts` → `proxy.ts` and the exported function from `middleware` → `proxy`. The behavior is identical; only the name changed.

- [ ] **Step 1: Create `proxy.ts` at the project root**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  const isAuthPage = pathname === '/login' || pathname === '/register'

  // Redirect authenticated users away from login/register
  if (isAuthPage) {
    if (!token) return NextResponse.next()
    if (token.role === 'MECHANIC') {
      if (!token.workshopId) {
        return NextResponse.redirect(new URL('/workshop/setup', request.url))
      }
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  // Unauthenticated → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root: redirect based on role
  if (pathname === '/') {
    if (token.role === 'MECHANIC') {
      if (!token.workshopId) {
        return NextResponse.redirect(new URL('/workshop/setup', request.url))
      }
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.redirect(new URL('/owner', request.url))
  }

  // Workshop setup: MECHANIC only, workshopId must be null
  if (pathname.startsWith('/workshop/setup')) {
    if (token.role !== 'MECHANIC') {
      return NextResponse.redirect(new URL('/owner', request.url))
    }
    if (token.workshopId) {
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.next()
  }

  // Mechanic routes: MECHANIC + workshopId required
  if (pathname.startsWith('/mechanic')) {
    if (token.role !== 'MECHANIC') {
      return NextResponse.redirect(new URL('/owner', request.url))
    }
    if (!token.workshopId) {
      return NextResponse.redirect(new URL('/workshop/setup', request.url))
    }
    return NextResponse.next()
  }

  // Owner routes: OWNER only
  if (pathname.startsWith('/owner')) {
    if (token.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/mechanic', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verify TypeScript on the proxy file**

```bash
npx tsc --noEmit
```

Expected: No errors on `proxy.ts`. (Ignore unrelated errors from other files not yet implemented.)

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy.ts for centralized route protection"
```

---

### Task 8: Login Page

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `signIn('credentials', ...)` from `next-auth/react`
- Produces: `/login` — email + password form; on success redirects to `/` (proxy then redirects to correct dashboard)

- [ ] **Step 1: Replace `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setError('Invalid email or password')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-sm text-center text-gray-600">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-600 underline">Register</a>
        </p>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: add login page form"
```

---

### Task 9: Register Page

**Files:**
- Modify: `app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/register` (Task 5), `signIn('credentials', ...)` from `next-auth/react`
- Produces: `/register` — role selector (Owner / Mechanic) then name/email/password form; on success auto-signs-in and redirects to `/`

- [ ] **Step 1: Replace `app/(auth)/register/page.tsx`**

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Role = 'OWNER' | 'MECHANIC'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!role) return

    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.')
      router.push('/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  if (!role) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col gap-6 w-full max-w-sm">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-gray-600 text-sm">I am a…</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setRole('OWNER')}
              className="border-2 rounded-lg p-4 text-left hover:border-blue-600 transition-colors"
            >
              <div className="font-semibold">Car Owner</div>
              <div className="text-sm text-gray-500">View my vehicle history and approve quotes</div>
            </button>
            <button
              onClick={() => setRole('MECHANIC')}
              className="border-2 rounded-lg p-4 text-left hover:border-blue-600 transition-colors"
            >
              <div className="font-semibold">Mechanic</div>
              <div className="text-sm text-gray-500">Manage clients, vehicles, and work orders</div>
            </button>
          </div>
          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 underline">Sign in</a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">
            {role === 'OWNER' ? 'Car Owner' : 'Mechanic'} account
          </h1>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 underline">Sign in</a>
        </p>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(auth)/register/page.tsx
git commit -m "feat: add register page with role selector"
```

---

### Task 10: Workshop Setup Page + Form

**Files:**
- Create: `app/(dashboard)/workshop/setup/page.tsx`
- Create: `components/workshop/WorkshopSetupForm.tsx`

**Interfaces:**
- Consumes: `getServerSession(authOptions)` (server-side auth check), `POST /api/workshop` (Task 6), `useSession().update()` (refresh JWT after workshop creation)
- Produces: `/workshop/setup` — workshop name/address/phone/email form; on success refreshes JWT and redirects to `/mechanic`

Note: `WorkshopSetupForm` calls `useSession().update()` after the API call succeeds. This triggers the `jwt` callback with `trigger:'update'`, which re-reads `workshopId` from DB and issues a fresh session cookie. The proxy then allows access to `/mechanic`.

- [ ] **Step 1: Create `components/workshop/WorkshopSetupForm.tsx`**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function WorkshopSetupForm() {
  const { update } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const address = (form.elements.namedItem('address') as HTMLInputElement).value
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    const res = await fetch('/api/workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, phone, email }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create workshop')
      setLoading(false)
      return
    }

    await update()
    router.push('/mechanic')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div>
        <h1 className="text-2xl font-bold">Set up your workshop</h1>
        <p className="text-gray-600 text-sm mt-1">Tell us about your workshop to get started.</p>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-name" className="text-sm font-medium">Workshop name</label>
        <input
          id="ws-name"
          name="name"
          type="text"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-address" className="text-sm font-medium">Address</label>
        <input
          id="ws-address"
          name="address"
          type="text"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-phone" className="text-sm font-medium">Phone</label>
        <input
          id="ws-phone"
          name="phone"
          type="tel"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ws-email" className="text-sm font-medium">Workshop email</label>
        <input
          id="ws-email"
          name="email"
          type="email"
          required
          className="border rounded px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Creating workshop…' : 'Create workshop'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/workshop/setup/page.tsx`**

```typescript
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { WorkshopSetupForm } from '@/components/workshop/WorkshopSetupForm'

export default async function WorkshopSetupPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role !== 'MECHANIC') redirect('/owner')
  if (session.user.workshopId) redirect('/mechanic')

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <WorkshopSetupForm />
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/workshop/WorkshopSetupForm.tsx app/(dashboard)/workshop/setup/page.tsx
git commit -m "feat: add workshop setup page and form"
```

---

### Task 11: Root Page + Dashboard Cleanup

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `app/(dashboard)/mechanic/page.tsx`
- Modify: `app/(dashboard)/owner/page.tsx`

**Interfaces:**
- The proxy (`proxy.ts`) handles all auth and role-based redirects. These files become simple passthroughs.

- [ ] **Step 1: Replace `app/page.tsx`**

The proxy redirects all authenticated traffic away from `/` before this page renders. Keep a minimal fallback:

```typescript
export default function HomePage() {
  return null
}
```

- [ ] **Step 2: Simplify `app/(dashboard)/layout.tsx`**

The proxy handles session and role checks. Remove the auth logic:

```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: Remove stale role checks from `app/(dashboard)/mechanic/page.tsx`**

```typescript
export default function MechanicDashboard() {
  return (
    <main>
      <h1>Mechanic Dashboard</h1>
    </main>
  )
}
```

- [ ] **Step 4: Remove stale role checks from `app/(dashboard)/owner/page.tsx`**

```typescript
export default function OwnerDashboard() {
  return (
    <main>
      <h1>Owner Dashboard</h1>
    </main>
  )
}
```

- [ ] **Step 5: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. Ignore any warnings about missing env vars.

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/(dashboard)/layout.tsx app/(dashboard)/mechanic/page.tsx app/(dashboard)/owner/page.tsx
git commit -m "chore: simplify dashboard pages and root page now that proxy handles auth"
```

---

## End-to-End Manual Test Checklist

After all tasks are complete, start the dev server (`npm run dev`, with Docker running) and verify:

1. `GET /` unauthenticated → redirects to `/login` ✓
2. Register as **Owner** (name/email/password) → auto-signs-in → redirects to `/owner` ✓
3. Register as **Mechanic** (name/email/password) → auto-signs-in → redirects to `/workshop/setup` ✓
4. Complete workshop setup form → redirects to `/mechanic` ✓
5. Sign out, sign back in as Mechanic → redirects to `/mechanic` (workshopId now in JWT) ✓
6. Mechanic visiting `/owner` → redirected to `/mechanic` ✓
7. Owner visiting `/mechanic` → redirected to `/owner` ✓
8. Mechanic visiting `/workshop/setup` after setup → redirected to `/mechanic` ✓
9. Unauthenticated visiting `/mechanic` → redirected to `/login` ✓
