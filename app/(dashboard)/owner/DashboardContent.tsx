'use client'

import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import {
  PlusIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  WORK_ORDER_PROGRESS_STAGE_ORDER,
  WORK_ORDER_PROGRESS_STAGE_LABELS,
} from '@/lib/workOrderStatus'

type VehicleSummary = {
  id: string
  label: string
  vin: string | null
  plate: string | null
  hasActiveRepair: boolean
}

export type ActiveRepairSummary = {
  id: string
  vehicle: string
  workOrder: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  progressStage: 'INSPECTING' | 'REPAIRING' | 'WAITING_PARTS' | null
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

// Bookends around the in-progress stages: PENDING is "Recibido", COMPLETED is "Listo".
export const TIMELINE_STEPS = [
  'Recibido',
  ...WORK_ORDER_PROGRESS_STAGE_ORDER.map(stage => WORK_ORDER_PROGRESS_STAGE_LABELS[stage]),
  'Listo',
]

export function timelineCurrentStep(
  status: ActiveRepairSummary['status'],
  progressStage: ActiveRepairSummary['progressStage']
): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') {
    const stageIndex = progressStage ? WORK_ORDER_PROGRESS_STAGE_ORDER.indexOf(progressStage) : -1
    // No stage set yet (or an unknown one) reads as the first in-progress step.
    return stageIndex === -1 ? 1 : stageIndex + 1
  }
  return TIMELINE_STEPS.length - 1
}

type TimelineStepState = 'done' | 'current' | 'pending'

export function timelineStepState(
  index: number,
  currentStep: number,
  status: ActiveRepairSummary['status']
): TimelineStepState {
  if (status === 'COMPLETED') return 'done'
  if (index < currentStep) return 'done'
  if (index === currentStep) return 'current'
  return 'pending'
}

const TIMELINE_STEP_LABEL_CLASS: Record<TimelineStepState, string> = {
  current: 'text-primary',
  done: 'text-foreground/80',
  pending: 'text-muted-foreground/50',
}

const sectionLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'

const enter = (delay: number) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})

function VehicleCard({ v, index, onOpen }: { v: VehicleSummary; index: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      {...enter(0.16 + index * 0.07)}
      whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      className="bezel h-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <div className="bezel-core flex h-full flex-col justify-between gap-8 p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08]">
            <CarIcon className="size-4.5" />
          </span>
          <Badge variant={v.hasActiveRepair ? 'active' : 'ok'}>
            <BadgeDot />
            {v.hasActiveRepair ? 'En taller' : 'Al día'}
          </Badge>
        </div>
        <div className="flex flex-col gap-3">
          <span className="font-display text-2xl font-medium leading-tight tracking-[-0.02em] text-foreground">
            {v.label}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {v.plate && (
              <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-xs font-medium uppercase tracking-[0.08em] text-foreground ring-1 ring-white/[0.1]">
                {v.plate}
              </span>
            )}
            {v.vin && (
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-muted-foreground/60">
                VIN {v.vin}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
}

function AppointmentRow({
  appt,
  onOpen,
  isLast,
}: {
  appt: AppointmentSummary
  onOpen: () => void
  isLast: boolean
}) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-4 px-2 py-3.5 text-left outline-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] first:pt-1 hover:bg-white/[0.03] focus-visible:ring-3 focus-visible:ring-ring/40 rounded-xl',
        !isLast && 'border-b border-white/[0.05]'
      )}
    >
      <div className="flex min-w-13 shrink-0 flex-col items-center rounded-xl bg-white/[0.05] px-2 py-2 ring-1 ring-white/[0.07]">
        <span className="font-mono text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-primary">
          {appt.month}
        </span>
        <span className="font-display text-xl font-medium leading-6 text-foreground">{appt.day}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{appt.title}</span>
        <span className="truncate text-xs text-muted-foreground">{appt.vehicle}</span>
      </div>
      <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

export function DashboardContent({ userName, vehicles, activeRepairs, upcomingAppointments }: DashboardContentProps) {
  const router = useRouter()

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14 px-4 sm:px-8">

          {/* Hero */}
          <motion.section {...enter(0)} className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Panel del propietario
              </span>
              <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                Hola, {userName}.
              </h1>
              <p className="max-w-lg text-base text-muted-foreground">
                El estado de tus vehículos y tus próximos turnos, de un vistazo.
              </p>
            </div>
            <Button onClick={() => router.push('/owner/vehicles/new')} className="shrink-0">
              Registrar vehículo
              <ButtonIconIsland>
                <PlusIcon className="size-3.5" />
              </ButtonIconIsland>
            </Button>
          </motion.section>

          {/* Bento */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Vehicles — wide cell */}
            <div className="flex flex-col gap-5 lg:col-span-8">
              <motion.div {...enter(0.1)} className="flex items-center justify-between px-1">
                <h2 className={sectionLabel}>Mis vehículos</h2>
                <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground/50 uppercase">
                  {vehicles.length.toString().padStart(2, '0')} registrados
                </span>
              </motion.div>

              {vehicles.length === 0 ? (
                <motion.div {...enter(0.16)} className="bezel">
                  <div className="bezel-core flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                      <CarIcon className="size-6" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-lg font-medium text-foreground">
                        Todavía no registraste vehículos
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Registrá el primero para empezar a construir su historial.
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => router.push('/owner/vehicles/new')}>
                      <PlusIcon className="size-3.5" />
                      Registrá tu primer vehículo
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {vehicles.map((v, i) => (
                    <VehicleCard key={v.id} v={v} index={i} onOpen={() => router.push(`/owner/vehicles/${v.id}`)} />
                  ))}
                </div>
              )}
            </div>

            {/* Appointments — narrow rail */}
            <div className="flex flex-col gap-5 lg:col-span-4">
              <motion.div {...enter(0.14)} className="flex items-center justify-between px-1">
                <h2 className={sectionLabel}>Turnos próximos</h2>
                {upcomingAppointments.length > 0 && (
                  <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground/50 uppercase">
                    {upcomingAppointments.length.toString().padStart(2, '0')}
                  </span>
                )}
              </motion.div>

              <motion.div {...enter(0.2)} className="bezel flex-1">
                <div className="bezel-core flex h-full flex-col justify-between gap-4 p-4">
                  {upcomingAppointments.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
                      <span className="flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                        <CalendarIcon className="size-5" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">Sin turnos próximos</span>
                        <span className="text-xs text-muted-foreground">
                          Buscá un taller y reservá tu próximo service.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {upcomingAppointments.map((appt, i) => (
                        <AppointmentRow
                          key={appt.id}
                          appt={appt}
                          isLast={i === upcomingAppointments.length - 1}
                          onOpen={() => router.push('/owner/schedule')}
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/owner/schedule')}
                    className="w-full"
                  >
                    Agendar servicio
                    <ButtonIconIsland>
                      <ArrowUpRightIcon className="size-3.5" />
                    </ButtonIconIsland>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Active repairs — full-width timeline */}
          {activeRepairs.length > 0 && (
            <section className="flex flex-col gap-5">
              <motion.h2 {...enter(0.24)} className={cn(sectionLabel, 'px-1')}>
                Reparaciones en curso
              </motion.h2>
              {activeRepairs.map((repair, r) => {
                if (repair.status === 'CANCELLED') {
                    return (
                      <motion.div key={repair.id} {...enter(0.28 + r * 0.08)} className="bezel">
                        <div className="bezel-core flex flex-wrap items-center justify-between gap-3 p-6 sm:p-8">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                              {repair.vehicle}
                            </span>
                            <span className="text-sm text-muted-foreground">{repair.workOrder}</span>
                          </div>
                          <Badge variant="danger">
                            <BadgeDot />
                            Cancelado
                          </Badge>
                        </div>
                      </motion.div>
                    )
                  }

                  const currentStep = timelineCurrentStep(repair.status, repair.progressStage)
                  const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                  const isDone = repair.status === 'COMPLETED'

                  return (
                    <motion.div key={repair.id} {...enter(0.28 + r * 0.08)} className="bezel">
                      <div className="bezel-core flex flex-col gap-2 p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                              {repair.vehicle}
                            </span>
                            <span className="text-sm text-muted-foreground">{repair.workOrder}</span>
                          </div>
                          <Badge variant={isDone ? 'ok' : 'active'}>
                            <BadgeDot className={isDone ? undefined : 'animate-pulse'} />
                            {isDone ? 'Listo' : 'En progreso'}
                          </Badge>
                        </div>

                        <div className="relative py-9">
                          <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-white/[0.08]" />
                          <motion.div
                            className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-primary shadow-[0_0_12px_rgba(242,179,80,0.6)]"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.fluid, delay: 0.5 }}
                          />
                          <div className="relative flex items-start justify-between">
                            {TIMELINE_STEPS.map((label, i) => {
                              const state = timelineStepState(i, currentStep, repair.status)
                              return (
                                <motion.div
                                  key={label}
                                  initial={{ opacity: 0, scale: 0.7 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{
                                    duration: motionTokens.duration.fast,
                                    ease: motionTokens.easing.smooth,
                                    delay: 0.55 + i * 0.08,
                                  }}
                                  className="relative z-10 flex flex-col items-center gap-2.5"
                                  style={{ width: `${100 / TIMELINE_STEPS.length}%` }}
                                >
                                  {state === 'done' && (
                                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card">
                                      <CheckIcon className="size-3" strokeWidth={2} />
                                    </span>
                                  )}
                                  {state === 'current' && (
                                    <motion.span
                                      animate={{ scale: [1, 1.15, 1] }}
                                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                                      className="flex size-7 items-center justify-center rounded-full bg-card ring-1 ring-primary shadow-[0_0_18px_rgba(242,179,80,0.45)]"
                                    >
                                      <span className="size-2 rounded-full bg-primary" />
                                    </motion.span>
                                  )}
                                  {state === 'pending' && (
                                    <span className="size-6 rounded-full bg-white/[0.05] ring-1 ring-white/[0.1]" />
                                  )}
                                  <span
                                    className={cn(
                                      'whitespace-nowrap text-center font-mono text-[0.5625rem] font-medium uppercase tracking-[0.14em] sm:text-[0.625rem]',
                                      TIMELINE_STEP_LABEL_CLASS[state]
                                    )}
                                  >
                                    {label}
                                  </span>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
            </section>
          )}
        </div>
      </main>
    </MotionConfig>
  )
}
