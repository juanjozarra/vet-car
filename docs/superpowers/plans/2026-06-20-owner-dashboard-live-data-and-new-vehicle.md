# Owner Dashboard Live Data & New Vehicle Registration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data on the owner dashboard with real Prisma queries, add the `Appointment` entity, and build the full "Register New Vehicle" form (`/owner/vehicles/new`) matching the Figma "User new vehicle view" design.

**Architecture:** The owner dashboard server component (`owner/page.tsx`) runs three parallel Prisma queries and passes serialized summaries to the `DashboardContent` client component — no Date objects cross the server/client boundary. Vehicle creation goes through `POST /api/vehicles`, which gates on the `OWNER` role. The new vehicle page (`/owner/vehicles/new`) is a server-auth guard that renders a client-side form component; on success the form calls the API and redirects back to `/owner`.

**Tech Stack:** Next.js 16 App Router (server components + Route Handlers), Prisma v7 (`@prisma/adapter-pg`), NextAuth v4 JWT sessions, Tailwind CSS v4 (colors as arbitrary values), `motion/react` (Framer Motion), Jest 30 (`npm test`).

## Global Constraints

- No new npm packages.
- All colors as Tailwind arbitrary values (e.g. `bg-[#2563eb]`) — no `@theme` tokens.
- Icons are inline SVG only — no icon library imports. New icons added to `components/ui/icons.tsx`.
- `AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing Next.js code. The existing patterns in this repo (workshop route, owner page) are the authoritative reference.
- No Date objects in client component props — format to strings on the server.
- `Appointment` model will be empty until a mechanic scheduling UI is built; the owner dashboard shows a "No upcoming appointments" empty state. This is expected and correct.
- Photo upload and VIN "Scan" button are visual-only (no file storage service). The form submits without a photo; `photoUrl` stays `null`.
- **Model field is a text input, not a dropdown.** The Figma shows Make/Model/Year all as selects, but enumerating every model is impractical for MVP. Make uses a curated dropdown; Model is free text. This is a known Figma divergence.
- Design system: Precision Dark (see `DESIGN.md`). Surface `#0b1326`, cards `#060e20`, on-surface `#dae2fd`, on-surface-variant `#c3c6d7`, outline-variant `#434655`, primary `#2563eb`, on-primary `#002a78`, primary-fixed `#dbe1ff`, on-primary-fixed `#00174b`.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `nickname/mileage/photoUrl/plateState` to `Vehicle`; add `AppointmentStatus` enum + `Appointment` model |
| Modify | `app/(dashboard)/owner/page.tsx` | Run parallel Prisma queries, serialize to plain objects, pass as props |
| Modify | `app/(dashboard)/owner/DashboardContent.tsx` | Accept typed props, remove all mock data, add empty states, wire "Register New Vehicle" button |
| Modify | `components/ui/icons.tsx` | Add `UploadIcon`, `OdometerIcon`, `ChevronDownIcon`, `ScanIcon` |
| Modify | `CLAUDE.md` | Update OWNER role description to reflect self-registration |
| Create | `app/api/vehicles/route.ts` | `POST /api/vehicles` — auth-gated vehicle creation |
| Create | `app/(dashboard)/owner/vehicles/new/page.tsx` | Auth guard server component for new vehicle route |
| Create | `app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx` | Client-side form matching Figma design |
| Create | `__tests__/api/vehicles.test.ts` | Unit tests for POST /api/vehicles |

---

## Task 1: Schema — Extend Vehicle + Add Appointment Model

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Vehicle.nickname`, `Vehicle.mileage`, `Vehicle.photoUrl`, `Vehicle.plateState`, `Vehicle.appointments`; `AppointmentStatus` enum; `Appointment` model used by Tasks 2, 3, and 4.

- [ ] **Step 1: Update `prisma/schema.prisma`**

Replace the `Vehicle` model and add the enum + `Appointment` model. The full new content for the relevant sections (insert after the `ServiceItem` model):

```prisma
// ── Enums ─────────────────────────────────────────────────────────────────────

enum Role {
  OWNER
  MECHANIC
}

enum WorkOrderStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ServiceItemType {
  REPAIR
  MAINTENANCE
  UPGRADE
  OTHER
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}

// ── Models ────────────────────────────────────────────────────────────────────

// ... (keep User, Workshop, Account, Session, VerificationToken, WorkOrder, ServiceItem unchanged)

model Vehicle {
  id         String   @id @default(cuid())
  make       String
  model      String
  year       Int
  vin        String?  @unique
  plate      String?
  nickname   String?
  mileage    Int?
  photoUrl   String?
  plateState String?
  ownerId    String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  owner        User          @relation("VehicleOwner", fields: [ownerId], references: [id])
  workOrders   WorkOrder[]
  appointments Appointment[]
}

model Appointment {
  id          String            @id @default(cuid())
  title       String
  scheduledAt DateTime
  notes       String?           @db.Text
  status      AppointmentStatus @default(SCHEDULED)
  vehicleId   String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}
```

The exact diff to apply to `prisma/schema.prisma`:

1. After the `WorkOrderStatus` enum block (after `}`), add:
```prisma

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
}
```

2. In the `Vehicle` model, after `plate      String?` and before `ownerId    String`, add:
```prisma
  nickname   String?
  mileage    Int?
  photoUrl   String?
  plateState String?
```

3. In the `Vehicle` model, after `workOrders WorkOrder[]`, add:
```prisma
  appointments Appointment[]
```

4. After the `ServiceItem` model closing `}`, add the full `Appointment` model:
```prisma

model Appointment {
  id          String            @id @default(cuid())
  title       String
  scheduledAt DateTime
  notes       String?           @db.Text
  status      AppointmentStatus @default(SCHEDULED)
  vehicleId   String
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Ensure the database is running**

```bash
docker compose up -d
```

Expected: `[+] Running 1/1` (container already running or newly started). All subsequent Prisma CLI commands require this — run it before migrating.

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate dev --name add-vehicle-fields-and-appointment
```

Expected: migration creates successfully, prints "Your database is now in sync with your schema."

- [ ] **Step 4: Regenerate the Prisma client**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no type errors. (If there are errors about `Appointment`, confirm `npx prisma generate` ran after the migration.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: extend Vehicle with optional fields and add Appointment model"
```

---

## Task 2: API Route — POST /api/vehicles

**Files:**
- Create: `app/api/vehicles/route.ts`
- Create: `__tests__/api/vehicles.test.ts`

**Interfaces:**
- Consumes: `prisma.vehicle.create` (Prisma client from Task 1), `getServerSession(authOptions)` (same pattern as `app/api/workshop/route.ts`)
- Request body: `{ nickname?, vin?, make, model, year, plate?, plateState?, mileage? }` — all strings
- Produces: `201 { id, make, model, year, ... }` or `400 { error }` or `401 { error }` or `409 { error }`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/vehicles.test.ts`:

```typescript
import { POST } from '@/app/api/vehicles/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { vehicle: { create: jest.fn() } },
}))

const mockSession = { user: { id: 'u1', role: 'OWNER', name: 'Alice', email: 'a@a.com' } }

describe('POST /api/vehicles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when role is MECHANIC', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'u1', role: 'MECHANIC' },
    })
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when make is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when model is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 with vehicle data on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const mockVehicle = { id: 'v1', make: 'Honda', model: 'CR-V', year: 2019, ownerId: 'u1' }
    ;(prisma.vehicle.create as jest.Mock).mockResolvedValue(mockVehicle)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.make).toBe('Honda')
    expect(data.year).toBe(2019)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern="__tests__/api/vehicles"
```

Expected: FAIL — "Cannot find module '@/app/api/vehicles/route'"

- [ ] **Step 3: Create `app/api/vehicles/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { nickname, vin, make, model, year, plate, plateState, mileage } =
    await request.json()

  if (!make || !model || !year) {
    return NextResponse.json(
      { error: 'Make, model, and year are required' },
      { status: 400 }
    )
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        nickname: nickname || null,
        vin: vin || null,
        make,
        model,
        year: parseInt(year, 10),
        plate: plate || null,
        plateState: plateState || null,
        mileage: mileage ? parseInt(mileage, 10) : null,
        ownerId: session.user.id,
      },
    })
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'VIN already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern="__tests__/api/vehicles"
```

Expected: PASS — 6 tests pass.

> **If Step 4 fails with a non-assertion error** (e.g. `ReferenceError: Request is not defined` or `TypeError: NextResponse.json is not a function`), this is a Jest environment issue, not a code bug. Fix by adding a `setupFilesAfterEach` polyfill for Web fetch APIs (or switch this file to `@jest-environment edge-runtime`). That is a harness fix — don't chase it as a logic error.

- [ ] **Step 5: Commit**

```bash
git add app/api/vehicles/route.ts __tests__/api/vehicles.test.ts
git commit -m "feat: add POST /api/vehicles — owner vehicle creation endpoint"
```

---

## Task 3: New Vehicle Page — Icons, Auth Guard, and Form

**Files:**
- Modify: `components/ui/icons.tsx` (add 4 icons)
- Create: `app/(dashboard)/owner/vehicles/new/page.tsx`
- Create: `app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx`

**Interfaces:**
- Consumes: `POST /api/vehicles` from Task 2; `DashboardNav`, `DashboardFooter` from `components/shared/`; `motionTokens` from `lib/motionTokens`
- Produces: `/owner/vehicles/new` route; on success, redirects to `/owner`

- [ ] **Step 1: Add icons to `components/ui/icons.tsx`**

Append these four exports to the bottom of `components/ui/icons.tsx`:

```typescript
export function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 8L12 3L7 8" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3v12" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function OdometerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.25" stroke="#8d90a0" strokeWidth="1.5"/>
      <path d="M5 11L8 8" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1" fill="#8d90a0"/>
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5V2a1 1 0 0 1 1-1h3M15 5V2a1 1 0 0 0-1-1h-3M1 11v3a1 1 0 0 0 1 1h3M15 11v3a1 1 0 0 1-1 1h-3" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1 8h14" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/owner/vehicles/new/page.tsx`**

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { NewVehicleForm } from './NewVehicleForm'

export default async function NewVehiclePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  return (
    <div className="flex flex-col min-h-screen bg-[#0b1326]">
      <DashboardNav
        userName={session.user.name ?? 'there'}
        userEmail={session.user.email ?? undefined}
      />
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-12">
          <NewVehicleForm />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx`**

```typescript
'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  UploadIcon,
  OdometerIcon,
  ChevronDownIcon,
  ScanIcon,
  PlusIcon,
} from '@/components/ui/icons'

// ── Static data ───────────────────────────────────────────────────────────────

const CAR_MAKES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche',
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i)

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK',
]

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = {
  nickname: string
  vin: string
  make: string
  model: string
  year: string
  plate: string
  plateState: string
  mileage: string
}

// ── Shared input/label styles ─────────────────────────────────────────────────

const inputCls =
  'bg-[#060e20] border border-[#434655] rounded px-4 py-3 text-sm text-[#dae2fd] placeholder-[#8d90a0] focus:border-[#2563eb] focus:outline-none w-full'

const labelCls = 'text-sm font-medium text-[#c3c6d7]'

// ── Component ─────────────────────────────────────────────────────────────────

export function NewVehicleForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({
    nickname: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    plate: '',
    plateState: '',
    mileage: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push('/owner')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      {/* Page title */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-4xl font-bold text-[#dae2fd] tracking-tight">Register New Vehicle</h1>
        <p className="text-base text-[#c3c6d7]">Add a vehicle to track its service history.</p>
      </div>

      {/* Form card — 600px centered */}
      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative bg-[#0b1326] border border-[#434655] rounded-lg overflow-hidden">
            {/* Subtle top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-[#2563eb] opacity-40" />

            <div className="p-8 flex flex-col gap-8">

              {/* ── Identification ─────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Identification</h2>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nickname" className={labelCls}>Vehicle Nickname</label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    placeholder="e.g. My Honda"
                    value={values.nickname}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vin" className={labelCls}>VIN</label>
                  <div className="flex gap-2">
                    <input
                      id="vin"
                      name="vin"
                      type="text"
                      placeholder="17-character VIN"
                      value={values.vin}
                      onChange={handleChange}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      disabled
                      aria-label="Scan VIN barcode (coming soon)"
                      className="shrink-0 flex items-center gap-2 px-4 py-3 bg-[#131b2e] border border-[#434655] rounded text-xs font-medium text-[#8d90a0] tracking-[0.05em] cursor-not-allowed"
                    >
                      <ScanIcon />
                      Scan
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Details ────────────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Details</h2>
                </div>

                {/* Make / Model / Year */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="make" className={labelCls}>Make</label>
                    <div className="relative">
                      <select
                        id="make"
                        name="make"
                        value={values.make}
                        onChange={handleChange}
                        required
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="" disabled>Select</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="model" className={labelCls}>Model</label>
                    <input
                      id="model"
                      name="model"
                      type="text"
                      placeholder="e.g. CR-V"
                      value={values.model}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className={labelCls}>Year</label>
                    <div className="relative">
                      <select
                        id="year"
                        name="year"
                        value={values.year}
                        onChange={handleChange}
                        required
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="" disabled>Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plate / State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plate" className={labelCls}>License Plate</label>
                    <input
                      id="plate"
                      name="plate"
                      type="text"
                      placeholder="ABC-1234"
                      value={values.plate}
                      onChange={handleChange}
                      className={inputCls}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plateState" className={labelCls}>State / Province</label>
                    <div className="relative">
                      <select
                        id="plateState"
                        name="plateState"
                        value={values.plateState}
                        onChange={handleChange}
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="">Select</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mileage */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mileage" className={labelCls}>Current Mileage</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <OdometerIcon />
                    </span>
                    <input
                      id="mileage"
                      name="mileage"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={values.mileage}
                      onChange={handleChange}
                      className="w-full bg-[#060e20] border border-[#434655] rounded pl-10 pr-12 py-3 text-sm text-[#dae2fd] placeholder-[#8d90a0] focus:border-[#2563eb] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8d90a0]">
                      km
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Media ──────────────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Media</h2>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Vehicle Photo</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center gap-3 h-36 border border-dashed border-[#434655] rounded hover:border-[#8d90a0] transition-colors overflow-hidden"
                  >
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium text-[#b4c5ff]">Click to upload</span>
                          <span className="text-xs text-[#8d90a0]">PNG, JPG or WEBP, max 5MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </div>
              </section>

              {/* ── Error ──────────────────────────────────────────────────── */}
              {error && (
                <p className="text-sm text-[#ffb4ab]">{error}</p>
              )}

              {/* ── Actions ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#434655]">
                <button
                  type="button"
                  onClick={() => router.push('/owner')}
                  className="px-4 py-2 text-sm font-medium text-[#c3c6d7] hover:text-[#dae2fd] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={
                    !submitting
                      ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }
                      : undefined
                  }
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className="flex items-center gap-2 h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <PlusIcon color="#002a78" />
                  {submitting ? 'Registering…' : 'Register Vehicle'}
                </motion.button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors. If you see errors about `ChevronDownIcon` or other icons, confirm Step 1 added them to `icons.tsx`.

- [ ] **Step 5: Verify the page renders in the browser**

Start the dev server (`npm run dev`), log in as an OWNER, navigate to `http://localhost:3000/owner/vehicles/new`. Confirm:
- The page renders with nav + footer
- All form sections are visible (Identification, Details, Media, Actions)
- Make and Year selects contain options
- Scan button is disabled and visually distinct
- Photo upload zone is visible; clicking it opens a file picker
- Cancel button navigates back to `/owner`

Do NOT test form submission yet (requires DB).

- [ ] **Step 6: Commit**

```bash
git add components/ui/icons.tsx app/(dashboard)/owner/vehicles/new/
git commit -m "feat: add Register New Vehicle page with Figma-matching form"
```

---

## Task 4: Owner Dashboard Live Data — Server Queries + DashboardContent Refactor

**Files:**
- Modify: `app/(dashboard)/owner/page.tsx`
- Modify: `app/(dashboard)/owner/DashboardContent.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `Appointment` model from Task 1; `useRouter` from `next/navigation` (new import in DashboardContent); `/owner/vehicles/new` route from Task 3
- Produces: live owner dashboard with real vehicles, active repairs, and upcoming appointments (empty state if none)

- [ ] **Step 1: Replace `app/(dashboard)/owner/page.tsx`**

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import { DashboardContent } from './DashboardContent'

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'OWNER') redirect('/mechanic')

  const userId = session.user.id

  const [rawVehicles, rawActiveRepairs, rawAppointments] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ownerId: userId },
      include: { workOrders: { where: { status: 'IN_PROGRESS' } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workOrder.findMany({
      where: { vehicle: { ownerId: userId }, status: 'IN_PROGRESS' },
      include: { vehicle: true },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
    prisma.appointment.findMany({
      where: {
        vehicle: { ownerId: userId },
        scheduledAt: { gte: new Date() },
        status: 'SCHEDULED',
      },
      include: { vehicle: true },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    }),
  ])

  const vehicles = rawVehicles.map(v => ({
    id: v.id,
    label: v.nickname ?? `${v.year} ${v.make} ${v.model}`,
    vin: v.vin,
    plate: v.plate,
    hasActiveRepair: v.workOrders.length > 0,
  }))

  const activeRepairs = rawActiveRepairs.map(o => ({
    id: o.id,
    vehicle: `${o.vehicle.year} ${o.vehicle.make} ${o.vehicle.model}`,
    workOrder: `Work Order #${o.id.slice(-6).toUpperCase()}`,
    status: o.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
  }))

  const upcomingAppointments = rawAppointments.map(a => ({
    id: a.id,
    month: a.scheduledAt.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: a.scheduledAt.getDate().toString(),
    title: a.title,
    vehicle: `${a.vehicle.year} ${a.vehicle.make} ${a.vehicle.model}`,
  }))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav
        userName={session.user.name ?? 'there'}
        userEmail={session.user.email ?? undefined}
      />
      <DashboardContent
        userName={session.user.name ?? 'there'}
        vehicles={vehicles}
        activeRepairs={activeRepairs}
        upcomingAppointments={upcomingAppointments}
      />
      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(dashboard)/owner/DashboardContent.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import {
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  CalendarIcon,
} from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'

// ── Types ─────────────────────────────────────────────────────────────────────

type VehicleSummary = {
  id: string
  label: string
  vin: string | null
  plate: string | null
  hasActiveRepair: boolean
}

type ActiveRepairSummary = {
  id: string
  vehicle: string
  workOrder: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

type AppointmentSummary = {
  id: string
  month: string
  day: string
  title: string
  vehicle: string
}

interface DashboardContentProps {
  userName: string
  vehicles: VehicleSummary[]
  activeRepairs: ActiveRepairSummary[]
  upcomingAppointments: AppointmentSummary[]
}

// ── Timeline helpers ──────────────────────────────────────────────────────────

const TIMELINE_STEPS = ['Checked In', 'Inspection', 'Repairing', 'Ready'] as const

function timelineCurrentStep(status: ActiveRepairSummary['status']): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') return 2
  return 3
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VehicleCard({ v, index }: { v: VehicleSummary; index: number }) {
  const accentColor = v.hasActiveRepair ? '#3a4a5f' : '#434655'
  const badgeBg = v.hasActiveRepair ? '#dbe1ff' : '#2d3449'
  const badgeText = v.hasActiveRepair ? '#00174b' : '#c3c6d7'
  const statusLabel = v.hasActiveRepair ? 'Active Repair' : 'Up to date'

  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
        delay: index * 0.08,
      }}
      whileHover={{
        y: -4,
        transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp },
      }}
      className="relative flex flex-col justify-between h-48 bg-[#060e20] border border-[#434655] hover:border-[#8d90a0] rounded-lg p-4 overflow-hidden flex-1 min-w-0 cursor-pointer transition-colors"
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accentColor }} />
      <div className="flex flex-col gap-1 pt-1">
        <span className="text-2xl font-semibold text-[#dae2fd] leading-8">{v.label}</span>
        {v.vin && (
          <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px]">VIN: {v.vin}</span>
        )}
        {v.plate && (
          <span className="text-sm text-[#c3c6d7]">License: {v.plate}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium tracking-[0.6px] px-2 py-1 rounded"
          style={{ background: badgeBg, color: badgeText }}
        >
          {statusLabel}
        </span>
        <button className="text-xs font-medium text-[#b4c5ff] tracking-[0.6px]">
          View Details
        </button>
      </div>
    </motion.div>
  )
}

type Step = { label: string; state: 'done' | 'current' | 'pending' }

function TimelineStep({ step, total, index }: { step: Step; total: number; index: number }) {
  const isDone = step.state === 'done'
  const isCurrent = step.state === 'current'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.smooth,
        delay: 0.6 + index * 0.08,
      }}
      className="flex flex-col items-center gap-2 relative z-10"
      style={{ width: `${100 / total}%` }}
    >
      {isDone && (
        <div className="size-6 rounded-full bg-[#b4c5ff] border-2 border-[#060e20] flex items-center justify-center shrink-0">
          <CheckIcon />
        </div>
      )}
      {isCurrent && (
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="size-8 rounded-full bg-[#060e20] border-4 border-[#b4c5ff] flex items-center justify-center shrink-0 -mt-1"
        >
          <div className="size-2 rounded-full bg-[#b4c5ff]" />
        </motion.div>
      )}
      {step.state === 'pending' && (
        <div className="size-6 rounded-full bg-[#2d3449] border-2 border-[#060e20] shrink-0" />
      )}
      <span
        className={`text-xs tracking-[0.6px] text-center whitespace-nowrap ${
          isCurrent
            ? 'font-bold text-[#b4c5ff]'
            : isDone
            ? 'font-medium text-[#dae2fd]'
            : 'font-medium text-[#c3c6d7]'
        }`}
      >
        {step.label}
      </span>
    </motion.div>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

export function DashboardContent({
  userName,
  vehicles,
  activeRepairs,
  upcomingAppointments,
}: DashboardContentProps) {
  const router = useRouter()

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-8 flex flex-col gap-8">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="flex items-end justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-normal text-[#dae2fd]">
                Welcome back, {userName}
              </span>
              <span className="text-base text-[#c3c6d7]">
                Here&apos;s the status of your vehicles and upcoming appointments.
              </span>
            </div>
            <motion.button
              onClick={() => router.push('/owner/vehicles/new')}
              whileHover={{
                scale: 1.02,
                transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp },
              }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="flex items-center gap-2 h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px]"
            >
              <PlusIcon color="#002a78" />
              Register New Vehicle
            </motion.button>
          </motion.div>

          {/* ── Vehicles + Appointments grid ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.smooth,
              delay: 0.08,
            }}
            className="grid grid-cols-12 gap-4"
          >
            {/* My Vehicles — 8 cols */}
            <div className="col-span-8 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-[#dae2fd]">My Vehicles</h2>
              {vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 bg-[#060e20] border border-dashed border-[#434655] rounded-lg p-6 gap-3">
                  <span className="text-sm text-[#c3c6d7]">No vehicles registered yet.</span>
                  <button
                    onClick={() => router.push('/owner/vehicles/new')}
                    className="flex items-center gap-2 h-9 px-3 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px]"
                  >
                    <PlusIcon color="#002a78" />
                    Register your first vehicle
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  {vehicles.map((v, i) => (
                    <VehicleCard key={v.id} v={v} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Appointments — 4 cols */}
            <div className="col-span-4 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-[#dae2fd]">Upcoming Appointments</h2>
              <div className="bg-[#060e20] border border-[#434655] rounded-lg p-4 flex flex-col gap-2">
                {upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <span className="text-sm text-[#c3c6d7]">No upcoming appointments.</span>
                  </div>
                ) : (
                  upcomingAppointments.map(appt => (
                    <div
                      key={appt.id}
                      className="border-l-2 border-[#b4c5ff] rounded flex items-center gap-4 pl-2.5 pr-2 py-2"
                    >
                      <div className="bg-[#2d3449] rounded min-w-12 flex flex-col items-center px-2 py-1 shrink-0">
                        <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px] uppercase">
                          {appt.month}
                        </span>
                        <span className="text-2xl font-semibold text-[#dae2fd] leading-8">
                          {appt.day}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-base font-semibold text-[#dae2fd]">{appt.title}</span>
                        <span className="text-sm text-[#c3c6d7]">{appt.vehicle}</span>
                      </div>
                      <ChevronRightIcon />
                    </div>
                  ))
                )}

                {/* Schedule Service CTA */}
                <div className="mt-4 pt-2">
                  <motion.button
                    whileHover={{
                      borderColor: '#8d90a0',
                      transition: { duration: motionTokens.duration.fast },
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-[#434655] text-xs font-medium text-[#c3c6d7] tracking-[0.6px]"
                  >
                    <CalendarIcon />
                    Schedule Service
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Active Repairs — only when there are repairs ───────────── */}
          {activeRepairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.normal,
                ease: motionTokens.easing.smooth,
                delay: 0.16,
              }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-2xl font-semibold text-[#dae2fd]">Active Repairs Tracking</h2>
              {activeRepairs.map(repair => {
                const currentStep = timelineCurrentStep(repair.status)
                const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                const steps: Step[] = TIMELINE_STEPS.map((label, i) => ({
                  label,
                  state:
                    i < currentStep ? 'done' : i === currentStep ? 'current' : 'pending',
                }))

                return (
                  <div
                    key={repair.id}
                    className="bg-[rgba(23,31,51,0.9)] backdrop-blur-sm border border-[#434655] rounded-lg p-6 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#434655] pb-3">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-[#dae2fd]">{repair.vehicle}</span>
                        <span className="text-sm text-[#c3c6d7]">{repair.workOrder}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#dbe1ff] px-2 py-1 rounded text-xs font-medium text-[#00174b] tracking-[0.6px]">
                        In Progress
                      </div>
                    </div>

                    <div className="relative py-8">
                      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-[#2d3449] rounded-full" />
                      <motion.div
                        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#b4c5ff] rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{
                          duration: motionTokens.duration.slow,
                          ease: motionTokens.easing.smooth,
                          delay: 0.5,
                        }}
                      />
                      <div className="relative flex items-start justify-between">
                        {steps.map((step, i) => (
                          <TimelineStep
                            key={step.label}
                            step={step}
                            index={i}
                            total={steps.length}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

        </div>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 3: Update CLAUDE.md role description**

In `CLAUDE.md`, update the OWNER role line under "Auth Roles":

```markdown
## Auth Roles

- **MECHANIC**: creates work orders, adds service items
- **OWNER**: registers their own vehicles (`POST /api/vehicles`), reads vehicles, work orders, and service items
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds. If you see errors about `prisma.appointment`, confirm Task 1 migration ran and `prisma generate` completed.

- [ ] **Step 5: Verify in the browser**

With Docker running (`docker compose up -d`), start the dev server (`npm run dev`), log in as an OWNER.

Check these scenarios:

**Scenario A — no vehicles (fresh account):**
- Dashboard shows the empty-state card under "My Vehicles" with "Register your first vehicle" button.
- Upcoming Appointments shows "No upcoming appointments."
- Active Repairs section is hidden.
- Clicking "Register New Vehicle" (header button) navigates to `/owner/vehicles/new`.
- Clicking "Register your first vehicle" (empty state) navigates to `/owner/vehicles/new`.

**Scenario B — submit the form:**
- On `/owner/vehicles/new`, fill Make (Honda), Model (CR-V), Year (2019), leave optional fields blank.
- Click "Register Vehicle". Should redirect to `/owner` on success.
- Dashboard now shows the new vehicle card with "Up to date" badge.

**Scenario C — form validation:**
- Submit without filling Make, Model, or Year. Browser native `required` validation should prevent submission.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/owner/page.tsx app/(dashboard)/owner/DashboardContent.tsx CLAUDE.md
git commit -m "feat: connect owner dashboard to live DB data and wire Register New Vehicle button"
```

---

## Self-Review

**Spec coverage:**
- ✅ Replace mock data on owner dashboard — Tasks 1 and 4
- ✅ New `Appointment` entity — Task 1
- ✅ Active Repair Tracking via `WorkOrder.status = IN_PROGRESS` — Task 4
- ✅ `POST /api/vehicles` endpoint — Task 2
- ✅ "Register New Vehicle" button wired — Task 4
- ✅ New vehicle page matching Figma design — Task 3
- ✅ Empty states for all three sections — Task 4

**Placeholder scan:** None — every step has exact code.

**Type consistency:**
- `VehicleSummary` defined in Task 4 (`DashboardContent.tsx`) and consumed only there.
- `ActiveRepairSummary.status` typed as the four-value union — matches `WorkOrderStatus` enum values.
- `AppointmentSummary` in Task 4 matches the `.map()` output shape produced in `page.tsx` Task 4.
- `timelineCurrentStep` returns `0 | 2 | 3` — all valid indices for a 4-step array.
- `POST /api/vehicles` test mocks match the actual function signature in Task 2.
