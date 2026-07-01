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
import styles from './DashboardContent.module.scss'

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
      className={`${styles.vehicleCard} flex flex-col justify-between h-48 p-4 flex-1 min-w-0`}
    >
      <div className={v.hasActiveRepair ? styles.accentActive : styles.accentIdle} />
      <div className="flex flex-col gap-1 pt-1">
        <span className={styles.vehicleName}>{v.label}</span>
        {v.vin && <span className={styles.vehicleMeta}>VIN: {v.vin}</span>}
        {v.plate && <span className={`${styles.vehicleMeta} text-sm`}>Patente: {v.plate}</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className={v.hasActiveRepair ? styles.badgeActive : styles.badgeIdle}>
          {v.hasActiveRepair ? 'Reparación activa' : 'Al día'}
        </span>
        <button className={styles.vehicleDetailBtn}>Ver detalles</button>
      </div>
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
        <div className={`${styles.stepDone} size-6 rounded-full flex items-center justify-center shrink-0`}>
          <CheckIcon />
        </div>
      )}
      {isCurrent && (
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`${styles.stepCurrent} size-8 rounded-full flex items-center justify-center shrink-0 -mt-1`}
        >
          <div className="size-2 rounded-full bg-[#55d8e1]" />
        </motion.div>
      )}
      {step.state === 'pending' && (
        <div className={`${styles.stepPending} size-6 rounded-full shrink-0`} />
      )}
      <span className={isCurrent ? styles.stepLabelCurrent : isDone ? styles.stepLabelDone : styles.stepLabelPending}>
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
              <span className={styles.welcomeText}>Hola de nuevo, {userName}</span>
              <span className={styles.welcomeSub}>Acá está el estado de tus vehículos y turnos próximos.</span>
            </div>
            <motion.button
              onClick={() => router.push('/owner/vehicles/new')}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={styles.btnRegister}
            >
              <PlusIcon color="#003739" />
              Registrar nuevo vehículo
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.08 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-8 flex flex-col gap-4">
              <h2 className={styles.sectionHeading}>Mis vehículos</h2>
              {vehicles.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyText}>Todavía no tenés vehículos registrados.</span>
                  <button onClick={() => router.push('/owner/vehicles/new')} className={styles.btnRegisterSm}>
                    <PlusIcon color="#003739" />
                    Registrá tu primer vehículo
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  {vehicles.map((v, i) => <VehicleCard key={v.id} v={v} index={i} />)}
                </div>
              )}
            </div>

            <div className="col-span-4 flex flex-col gap-4">
              <h2 className={styles.sectionHeading}>Turnos próximos</h2>
              <div className={`${styles.appointmentsCard} p-4 flex flex-col gap-2`}>
                {upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <span className={styles.noAppts}>No hay turnos próximos.</span>
                  </div>
                ) : (
                  upcomingAppointments.map(appt => (
                    <button
                      key={appt.id}
                      onClick={() => router.push('/owner/schedule')}
                      className={`${styles.appointmentItem} flex items-center gap-4 pl-2.5 pr-2 py-2 w-full text-left`}
                    >
                      <div className={`${styles.apptDateBox} flex flex-col items-center px-2 py-1`}>
                        <span className={styles.apptMonth}>{appt.month}</span>
                        <span className={styles.apptDay}>{appt.day}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className={styles.apptTitle}>{appt.title}</span>
                        <span className={styles.apptVehicle}>{appt.vehicle}</span>
                      </div>
                      <ChevronRightIcon />
                    </button>
                  ))
                )}
                <div className="mt-4 pt-2">
                  <motion.button
                    onClick={() => router.push('/owner/schedule')}
                    whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                    whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                    className={styles.scheduleBtn}
                  >
                    <CalendarIcon />
                    Agendar servicio
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {activeRepairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.16 }}
              className="flex flex-col gap-4"
            >
              <h2 className={styles.sectionHeading}>Seguimiento de reparaciones activas</h2>
              {activeRepairs.map(repair => {
                const currentStep = timelineCurrentStep(repair.status)
                const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                const steps: Step[] = TIMELINE_STEPS.map((label, i) => ({
                  label,
                  state: i < currentStep ? 'done' : i === currentStep ? 'current' : 'pending',
                }))

                return (
                  <div key={repair.id} className={`${styles.repairCard} p-6 flex flex-col gap-4`}>
                    <div className={`${styles.repairCardHeader} flex items-center justify-between pb-3`}>
                      <div className="flex flex-col">
                        <span className={styles.repairVehicle}>{repair.vehicle}</span>
                        <span className={styles.repairOrder}>{repair.workOrder}</span>
                      </div>
                      <div className={styles.repairStatusBadge}>En progreso</div>
                    </div>
                    <div className="relative py-8">
                      <div className={`${styles.progressTrack} absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full`} />
                      <motion.div
                        className={`${styles.progressBar} absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full`}
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
