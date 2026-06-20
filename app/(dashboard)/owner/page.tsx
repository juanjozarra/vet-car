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

function TimelineStep({ step, total }: { step: Step; index: number; total: number }) {
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
  if (session.user.role !== 'OWNER') redirect('/mechanic')

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
