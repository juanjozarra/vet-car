# Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the vehicle owner dashboard (`/owner`) matching the Figma "User dashbord" design, with mock data for vehicles, appointments, and active repair timeline.

**Architecture:** Server Component page reads session via `getServerSession` and passes user name to shared layout components; all data is hardcoded mock constants in the page file (no DB queries yet). Top nav and footer are extracted as reusable Server Components accepting props. Root `app/page.tsx` redirects to the role-appropriate dashboard or `/login`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, NextAuth v4 (`getServerSession`), inline SVGs from `components/ui/icons.tsx`.

## Global Constraints

- Dark-mode-first. Background `#0b1326`, cards `#060e20`, nav `#060e20`.
- All colors as Tailwind arbitrary values — design tokens are NOT in `@theme`.
- No icon library installed — inline SVG components in `components/ui/icons.tsx`.
- Figma asset URLs expire in 7 days — never use them in production code.
- `useRouter`/`useSession` from `next/navigation`/`next-auth/react` only in `'use client'` components.
- `getServerSession(authOptions)` in Server Components.
- `authOptions` imported from `@/lib/auth`.
- No new npm packages.
- Buttons with unimplemented functionality render as visual-only (no `onClick`).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/page.tsx` | Role-based redirect after login |
| Modify | `app/(dashboard)/layout.tsx` | Auth guard + dark bg for all dashboard routes |
| Modify | `components/ui/icons.tsx` | Add BellIcon, GearIcon, PlusIcon, ChevronRightIcon, CheckIcon, CalendarIcon |
| Create | `components/shared/DashboardNav.tsx` | Top nav bar shared by dashboard pages |
| Create | `components/shared/DashboardFooter.tsx` | Footer shared by dashboard pages |
| Modify | `app/(dashboard)/owner/page.tsx` | Full owner dashboard with mock data |

---

### Task 1: Root redirect + dashboard auth guard

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/(dashboard)/layout.tsx`

**Interfaces:**
- Produces: authenticated users land on `/owner` or `/mechanic`; unauthenticated users on any `/(dashboard)` route go to `/login`

- [ ] **Step 1: Update `app/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role === 'MECHANIC') redirect('/mechanic')
  redirect('/owner')
}
```

- [ ] **Step 2: Update `app/(dashboard)/layout.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen bg-[#0b1326]">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/(dashboard)/layout.tsx
git commit -m "feat: add role-based root redirect and dashboard auth guard"
```

---

### Task 2: Add new icons to shared icon file

**Files:**
- Modify: `components/ui/icons.tsx`

**Interfaces:**
- Produces: `BellIcon`, `GearIcon`, `PlusIcon`, `ChevronRightIcon`, `CheckIcon`, `CalendarIcon` — all `() => JSX.Element`, no props

- [ ] **Step 1: Append icons to `components/ui/icons.tsx`**

Add these exports at the bottom of the existing file:

```tsx
export function BellIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 18a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm6-5V8a6 6 0 0 0-5-5.92V1a1 1 0 1 0-2 0v1.08A6 6 0 0 0 2 8v5l-1.71 1.71A1 1 0 0 0 1 16h14a1 1 0 0 0 .71-1.71L14 13z" fill="#c3c6d7"/>
    </svg>
  )
}

export function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 11.5A2.5 2.5 0 1 1 9 6.5a2.5 2.5 0 0 1 0 5zm6.36-1.43a5.9 5.9 0 0 0 .05-.57c0-.2-.02-.4-.05-.58l1.26-.97a.3.3 0 0 0 .07-.38l-1.2-2.06a.3.3 0 0 0-.36-.13l-1.48.59a5.6 5.6 0 0 0-1-.58L12.4 3.9a.3.3 0 0 0-.3-.26h-2.4a.3.3 0 0 0-.3.26l-.23 1.57c-.36.14-.7.33-1 .58l-1.48-.6a.3.3 0 0 0-.36.14L5.13 7.65a.28.28 0 0 0 .07.38l1.26.97c-.03.18-.05.38-.05.57 0 .2.02.4.05.58L5.2 11.12a.3.3 0 0 0-.07.38l1.2 2.06c.07.13.23.17.36.13l1.48-.59c.3.22.64.41 1 .58l.23 1.57c.03.15.17.26.3.26h2.4c.13 0 .27-.11.3-.26l.23-1.57c.36-.17.7-.36 1-.58l1.48.59c.13.04.29 0 .36-.13l1.2-2.06a.28.28 0 0 0-.07-.38l-1.26-.97z" fill="#c3c6d7"/>
    </svg>
  )
}

export function PlusIcon({ color = '#002a78' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1v12M1 7h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 1L6.5 6L1.5 11" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4L3.5 6.5L9 1" stroke="#0b1326" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="14" height="14" rx="1.5" stroke="#c3c6d7" strokeWidth="1.5"/>
      <path d="M1 7h14" stroke="#c3c6d7" strokeWidth="1.5"/>
      <path d="M5 1v3M11 1v3" stroke="#c3c6d7" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/ui/icons.tsx
git commit -m "feat: add dashboard icons (bell, gear, plus, chevron, check, calendar)"
```

---

### Task 3: DashboardNav component

**Files:**
- Create: `components/shared/DashboardNav.tsx`

**Interfaces:**
- Consumes: `userName: string` prop (user's full name for avatar initials)
- Produces: `DashboardNav({ userName }: { userName: string })` — Server Component, no interactivity

- [ ] **Step 1: Create `components/shared/DashboardNav.tsx`**

```tsx
import { BellIcon, GearIcon, PlusIcon } from '@/components/ui/icons'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function DashboardNav({ userName }: { userName: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#060e20] border-b border-[#434655] flex items-center justify-between px-8">
      {/* Logo + nav links */}
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-[#b4c5ff] tracking-tight">
          AutoStream Pro
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <span className="text-sm text-[#b4c5ff] border-b-2 border-[#b4c5ff] pb-1.5 cursor-pointer">
            Dashboard
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Work Orders
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Inventory
          </span>
          <span className="text-sm text-[#c3c6d7] hover:text-[#dae2fd] transition-colors cursor-pointer">
            Scheduling
          </span>
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button className="flex items-center justify-center h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px]">
          New Order
        </button>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity">
            <BellIcon />
          </button>
          <button className="p-1 hover:opacity-70 transition-opacity">
            <GearIcon />
          </button>
        </div>
        {/* Avatar */}
        <div className="size-8 rounded-full border border-[#434655] bg-[#222a3d] flex items-center justify-center">
          <span className="text-[10px] font-semibold text-[#b4c5ff]">
            {getInitials(userName)}
          </span>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/shared/DashboardNav.tsx
git commit -m "feat: add DashboardNav shared component"
```

---

### Task 4: DashboardFooter component

**Files:**
- Create: `components/shared/DashboardFooter.tsx`

**Interfaces:**
- Produces: `DashboardFooter()` — Server Component, no props

- [ ] **Step 1: Create `components/shared/DashboardFooter.tsx`**

```tsx
export function DashboardFooter() {
  return (
    <footer className="bg-[#171f33] border-t border-[#434655] flex items-center justify-between px-8 py-8">
      <span className="text-2xl font-bold text-[#dae2fd] tracking-[0.6px]">
        AutoStream Pro
      </span>
      <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px]">
        © 2024 AutoStream Pro Management Systems. All rights reserved.
      </span>
      <nav className="flex items-center gap-4">
        {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Fleet Solutions'].map(link => (
          <span key={link} className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px] cursor-pointer hover:text-[#dae2fd] transition-colors">
            {link}
          </span>
        ))}
      </nav>
    </footer>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/shared/DashboardFooter.tsx
git commit -m "feat: add DashboardFooter shared component"
```

---

### Task 5: Owner dashboard page

**Files:**
- Modify: `app/(dashboard)/owner/page.tsx`

**Interfaces:**
- Consumes: `DashboardNav({ userName })`, `DashboardFooter()` from shared components; `CheckIcon`, `PlusIcon`, `ChevronRightIcon`, `CalendarIcon` from `@/components/ui/icons`; `getServerSession(authOptions)` for user name
- Produces: full `/owner` dashboard route with mock data

- [ ] **Step 1: Write `app/(dashboard)/owner/page.tsx`**

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/shared/DashboardNav'
import { DashboardFooter } from '@/components/shared/DashboardFooter'
import {
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  CalendarIcon,
} from '@/components/ui/icons'

// ── Mock data ────────────────────────────────────────────────────────────────

const VEHICLES = [
  {
    id: 'v1',
    label: '2019 Honda CR-V',
    vin: 'JHLRW2H5XKC123456',
    plate: 'ABC-1234',
    status: 'active' as const,
    statusLabel: 'Active Repair',
    accentColor: '#3a4a5f',
    badgeBg: '#dbe1ff',
    badgeText: '#00174b',
  },
  {
    id: 'v2',
    label: '2015 Ford F-150',
    vin: '1FTEW1EF7FF123456',
    plate: 'XYZ-9876',
    status: 'ok' as const,
    statusLabel: 'Up to date',
    accentColor: '#434655',
    badgeBg: '#2d3449',
    badgeText: '#c3c6d7',
  },
]

const APPOINTMENTS = [
  {
    id: 'a1',
    month: 'OCT',
    day: '24',
    title: 'Routine Maintenance',
    vehicle: '2015 Ford F-150',
  },
]

const ACTIVE_REPAIR = {
  vehicle: '2019 Honda CR-V',
  workOrder: 'Work Order #WO-4921',
  steps: [
    { label: 'Checked In', state: 'done' as const },
    { label: 'Inspection', state: 'done' as const },
    { label: 'Repairing', state: 'current' as const },
    { label: 'Ready', state: 'pending' as const },
  ],
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VehicleCard({ v }: { v: typeof VEHICLES[0] }) {
  return (
    <div className="relative flex flex-col justify-between h-48 bg-[#060e20] border border-[#434655] rounded-lg p-4 overflow-hidden flex-1 min-w-0">
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: v.accentColor }}
      />
      {/* Info */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-start justify-between">
          <span className="text-2xl font-semibold text-[#dae2fd] leading-8">{v.label}</span>
        </div>
        <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px]">VIN: {v.vin}</span>
        <span className="text-sm text-[#c3c6d7]">License: {v.plate}</span>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium tracking-[0.6px] px-2 py-1 rounded"
          style={{ background: v.badgeBg, color: v.badgeText }}
        >
          {v.statusLabel}
        </span>
        <button className="text-xs font-medium text-[#b4c5ff] tracking-[0.6px]">
          View Details
        </button>
      </div>
    </div>
  )
}

type Step = { label: string; state: 'done' | 'current' | 'pending' }

function TimelineStep({ step, index, total }: { step: Step; index: number; total: number }) {
  const isDone = step.state === 'done'
  const isCurrent = step.state === 'current'

  return (
    <div className="flex flex-col items-center gap-2 relative z-10" style={{ width: `${100 / total}%` }}>
      {isDone && (
        <div className="size-6 rounded-full bg-[#b4c5ff] border-2 border-[#060e20] flex items-center justify-center shrink-0">
          <CheckIcon />
        </div>
      )}
      {isCurrent && (
        <div className="size-8 rounded-full bg-[#060e20] border-4 border-[#b4c5ff] flex items-center justify-center shrink-0 -mt-1">
          <div className="size-2 rounded-full bg-[#b4c5ff]" />
        </div>
      )}
      {step.state === 'pending' && (
        <div className="size-6 rounded-full bg-[#2d3449] border-2 border-[#060e20] shrink-0" />
      )}
      <span
        className={`text-xs tracking-[0.6px] text-center whitespace-nowrap ${
          isCurrent ? 'font-bold text-[#b4c5ff]' : isDone ? 'font-medium text-[#dae2fd]' : 'font-medium text-[#c3c6d7]'
        }`}
      >
        {step.label}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function OwnerDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const userName = session.user.name ?? 'there'
  const completedCount = ACTIVE_REPAIR.steps.filter(s => s.state === 'done').length
  const progressPct = (completedCount / (ACTIVE_REPAIR.steps.length - 1)) * 100

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNav userName={userName} />

      {/* Main content — offset by nav height */}
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-8 flex flex-col gap-8">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base font-normal text-[#dae2fd]">
                Welcome back, {userName}
              </span>
              <span className="text-base text-[#c3c6d7]">
                Here&apos;s the status of your vehicles and upcoming appointments.
              </span>
            </div>
            <button className="flex items-center gap-2 h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px]">
              <PlusIcon color="#002a78" />
              Register New Vehicle
            </button>
          </div>

          {/* ── Vehicles + Appointments grid ───────────────────────────── */}
          <div className="grid grid-cols-12 gap-4">

            {/* My Vehicles — 8 cols */}
            <div className="col-span-8 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-[#dae2fd]">My Vehicles</h2>
              <div className="flex gap-4">
                {VEHICLES.map(v => <VehicleCard key={v.id} v={v} />)}
              </div>
            </div>

            {/* Upcoming Appointments — 4 cols */}
            <div className="col-span-4 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-[#dae2fd]">Upcoming Appointments</h2>
              <div className="bg-[#060e20] border border-[#434655] rounded-lg p-4 flex flex-col gap-2">
                {APPOINTMENTS.map(appt => (
                  <div key={appt.id} className="border-l-2 border-[#b4c5ff] rounded flex items-center gap-4 pl-2.5 pr-2 py-2">
                    <div className="bg-[#2d3449] rounded min-w-12 flex flex-col items-center px-2 py-1 shrink-0">
                      <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px] uppercase">{appt.month}</span>
                      <span className="text-2xl font-semibold text-[#dae2fd] leading-8">{appt.day}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-base font-semibold text-[#dae2fd]">{appt.title}</span>
                      <span className="text-sm text-[#c3c6d7]">{appt.vehicle}</span>
                    </div>
                    <ChevronRightIcon />
                  </div>
                ))}

                {/* Schedule Service CTA */}
                <div className="mt-4 pt-2">
                  <button className="w-full flex items-center justify-center gap-2 py-2 rounded border border-dashed border-[#434655] text-xs font-medium text-[#c3c6d7] tracking-[0.6px]">
                    <CalendarIcon />
                    Schedule Service
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Active Repairs Timeline ─────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-[#dae2fd]">Active Repairs Tracking</h2>
            <div className="bg-[rgba(23,31,51,0.9)] backdrop-blur-sm border border-[#434655] rounded-lg p-6 flex flex-col gap-4">
              {/* Repair header */}
              <div className="flex items-center justify-between border-b border-[#434655] pb-3">
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-[#dae2fd]">{ACTIVE_REPAIR.vehicle}</span>
                  <span className="text-sm text-[#c3c6d7]">{ACTIVE_REPAIR.workOrder}</span>
                </div>
                <div className="flex items-center gap-1 bg-[#dbe1ff] px-2 py-1 rounded text-xs font-medium text-[#00174b] tracking-[0.6px]">
                  In Progress
                </div>
              </div>

              {/* Timeline */}
              <div className="relative py-8">
                {/* Track background */}
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-[#2d3449] rounded-full" />
                {/* Track filled */}
                <div
                  className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#b4c5ff] rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
                {/* Steps */}
                <div className="relative flex items-start justify-between">
                  {ACTIVE_REPAIR.steps.map((step, i) => (
                    <TimelineStep
                      key={step.label}
                      step={step}
                      index={i}
                      total={ACTIVE_REPAIR.steps.length}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <DashboardFooter />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Verify lint**

```bash
npm run lint
```

Expected: only the pre-existing `jest.config.js` error, no new errors.

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`, sign in as an OWNER. Verify:
- TopNav shows "AutoStream Pro" logo, nav links, "New Order" button, bell, gear, avatar initials
- "Welcome back, [name]" header with "Register New Vehicle" button
- Two vehicle cards side by side (2019 Honda CR-V — Active Repair, 2015 Ford F-150 — Up to date)
- Upcoming Appointments card with Oct 24 entry + "Schedule Service" button
- Active Repairs Tracking timeline with steps: Checked In ✓, Inspection ✓, Repairing (current, pulsing), Ready (pending)
- Footer with "AutoStream Pro" + copyright + 4 links

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/owner/page.tsx
git commit -m "feat: implement owner dashboard with vehicle cards, appointments, and repair timeline"
```

---

## Self-Review

**Spec coverage:**
- TopNav with logo, links, CTA, icons, avatar ✅ (Task 3)
- "Welcome back, [name]" + subtitle + Register New Vehicle button ✅ (Task 5)
- My Vehicles section — 2 cards, 8-col grid ✅ (Task 5)
- Upcoming Appointments section — 4-col grid ✅ (Task 5)
- Active Repairs Tracking timeline — 4 steps, 50% progress ✅ (Task 5)
- Footer ✅ (Task 4)
- Root redirect after login ✅ (Task 1)
- Auth guard on dashboard routes ✅ (Task 1)
- All button actions unimplemented (visual only) ✅ per spec

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `VEHICLES[0]` type inferred by TypeScript from the `as const` discriminant — consistent throughout.
- `Step` type defined once, used in `TimelineStep` props.
- `DashboardNav` prop `userName: string` — consistent between Task 3 (definition) and Task 5 (usage).
- `DashboardFooter()` — no props, consistent.
