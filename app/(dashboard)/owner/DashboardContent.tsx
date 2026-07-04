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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

const MotionButton = motion.create(Button)

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

const TIMELINE_STEPS = ['Ingresado', 'Inspección', 'Reparando', 'Listo'] as const

function timelineCurrentStep(status: ActiveRepairSummary['status']): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') return 2
  return 3
}

type Step = { label: string; state: 'done' | 'current' | 'pending' }

function VehicleCard({ v, index }: { v: VehicleSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      className="flex-1 min-w-0"
    >
      <Card className="relative h-48 p-4 flex-col justify-between gap-0 cursor-pointer transition-colors hover:border-[#869394]">
        <div className={`absolute top-0 left-0 right-0 h-1 ${v.hasActiveRepair ? 'bg-primary' : 'bg-border'}`} />
        <div className="flex flex-col gap-1 pt-1">
          <span className="text-2xl font-semibold text-foreground leading-8 font-mono">{v.label}</span>
          {v.vin && <span className="text-xs font-medium text-muted-foreground tracking-[0.037em]">VIN: {v.vin}</span>}
          {v.plate && <span className="text-sm font-medium text-muted-foreground tracking-[0.037em]">Patente: {v.plate}</span>}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={v.hasActiveRepair ? 'active' : 'idle'}>
            {v.hasActiveRepair ? 'Reparación activa' : 'Al día'}
          </Badge>
          <button className="text-xs font-medium text-primary tracking-[0.037em]">Ver detalles</button>
        </div>
      </Card>
    </motion.div>
  )
}

function TimelineStep({ step, total, index }: { step: Step; total: number; index: number }) {
  const isDone = step.state === 'done'
  const isCurrent = step.state === 'current'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth, delay: 0.6 + index * 0.08 }}
      className="flex flex-col items-center gap-2 relative z-10"
      style={{ width: `${100 / total}%` }}
    >
      {isDone && (
        <div className="size-6 rounded-full flex items-center justify-center shrink-0 bg-primary border-2 border-card">
          <CheckIcon />
        </div>
      )}
      {isCurrent && (
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="size-8 rounded-full flex items-center justify-center shrink-0 -mt-1 bg-card border-4 border-primary"
        >
          <div className="size-2 rounded-full bg-[#55d8e1]" />
        </motion.div>
      )}
      {step.state === 'pending' && (
        <div className="size-6 rounded-full shrink-0 bg-muted border-2 border-card" />
      )}
      <span className={
        isCurrent
          ? 'text-xs font-bold tracking-[0.037em] text-center whitespace-nowrap text-primary font-mono'
          : isDone
            ? 'text-xs font-medium tracking-[0.037em] text-center whitespace-nowrap text-foreground font-mono'
            : 'text-xs font-medium tracking-[0.037em] text-center whitespace-nowrap text-muted-foreground font-mono'
      }>
        {step.label}
      </span>
    </motion.div>
  )
}

export function DashboardContent({ userName, vehicles, activeRepairs, upcomingAppointments }: DashboardContentProps) {
  const router = useRouter()

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-8 flex flex-col gap-8">

          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="flex items-end justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base text-foreground">Hola de nuevo, {userName}</span>
              <span className="text-base text-muted-foreground">Acá está el estado de tus vehículos y turnos próximos.</span>
            </div>
            <MotionButton
              onClick={() => router.push('/owner/vehicles/new')}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="h-10 px-4 text-xs tracking-[0.037em]"
            >
              <PlusIcon color="#003739" />
              Registrar nuevo vehículo
            </MotionButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.08 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-8 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-foreground font-mono">Mis vehículos</h2>
              {vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 bg-card border border-dashed border-border rounded-lg">
                  <span className="text-sm text-muted-foreground">Todavía no tenés vehículos registrados.</span>
                  <Button onClick={() => router.push('/owner/vehicles/new')} className="h-9 px-3 text-xs tracking-[0.037em]">
                    <PlusIcon color="#003739" />
                    Registrá tu primer vehículo
                  </Button>
                </div>
              ) : (
                <div className="flex gap-4">
                  {vehicles.map((v, i) => <VehicleCard key={v.id} v={v} index={i} />)}
                </div>
              )}
            </div>

            <div className="col-span-4 flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-foreground font-mono">Turnos próximos</h2>
              <Card className="p-4 gap-2">
                {upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <span className="text-sm text-muted-foreground">No hay turnos próximos.</span>
                  </div>
                ) : (
                  upcomingAppointments.map(appt => (
                    <button
                      key={appt.id}
                      onClick={() => router.push('/owner/schedule')}
                      className="flex items-center gap-4 pl-2.5 pr-2 py-2 w-full text-left border-l-2 border-primary rounded-r-lg"
                    >
                      <div className="flex flex-col items-center px-2 py-1 bg-muted rounded-lg min-w-12 shrink-0">
                        <span className="text-xs font-medium text-muted-foreground tracking-[0.037em] uppercase font-mono">{appt.month}</span>
                        <span className="text-2xl font-semibold text-foreground leading-8 font-mono">{appt.day}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="text-base font-semibold text-foreground">{appt.title}</span>
                        <span className="text-sm text-muted-foreground">{appt.vehicle}</span>
                      </div>
                      <ChevronRightIcon />
                    </button>
                  ))
                )}
                <div className="mt-4 pt-2">
                  <MotionButton
                    onClick={() => router.push('/owner/schedule')}
                    whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                    whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                    variant="outline"
                    className="w-full border-dashed font-mono text-xs tracking-[0.037em] text-muted-foreground hover:border-primary hover:bg-transparent hover:text-muted-foreground"
                  >
                    <CalendarIcon />
                    Agendar servicio
                  </MotionButton>
                </div>
              </Card>
            </div>
          </motion.div>

          {activeRepairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.16 }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-2xl font-semibold text-foreground font-mono">Seguimiento de reparaciones activas</h2>
              {activeRepairs.map(repair => {
                const currentStep = timelineCurrentStep(repair.status)
                const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                const steps: Step[] = TIMELINE_STEPS.map((label, i) => ({
                  label,
                  state: i < currentStep ? 'done' : i === currentStep ? 'current' : 'pending',
                }))

                return (
                  <Card key={repair.id} className="p-6 gap-4 bg-card/90 backdrop-blur-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <div className="flex flex-col">
                        <span className="text-base font-semibold text-foreground">{repair.vehicle}</span>
                        <span className="text-sm text-muted-foreground">{repair.workOrder}</span>
                      </div>
                      <Badge variant="active">En progreso</Badge>
                    </div>
                    <div className="relative py-8">
                      <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-muted" />
                      <motion.div
                        className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay: 0.5 }}
                      />
                      <div className="relative flex items-start justify-between">
                        {steps.map((step, i) => (
                          <TimelineStep key={step.label} step={step} index={i} total={steps.length} />
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </motion.div>
          )}

        </div>
      </main>
    </MotionConfig>
  )
}
