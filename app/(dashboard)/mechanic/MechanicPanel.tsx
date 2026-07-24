'use client'

import Link from 'next/link'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  ArrowUpRightIcon,
  CheckIcon,
  MapPinIcon,
  PhoneIcon,
  WrenchIcon,
} from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MechanicPanelProps {
  workshopName: string
  address: string
  phone: string
  specialtyLabels: string[]
  hoursConfiguredDays: number
  slotDurationMinutes: number
  hasLocation: boolean
  pendingTicketCount: number
}

const sectionLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'

const enter = (delay: number) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})

function ChecklistRow({
  ok,
  label,
  detail,
}: {
  ok: boolean
  label: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0">
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full ring-1 transition-colors',
          ok ? 'bg-ok/15 text-ok ring-ok/30' : 'bg-white/[0.04] text-muted-foreground/40 ring-white/[0.1]'
        )}
        aria-hidden="true"
      >
        {ok ? <CheckIcon className="size-3" strokeWidth={2} /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="truncate text-xs text-muted-foreground">{detail}</span>
      </div>
      {!ok && <Badge variant="active">Pendiente</Badge>}
    </div>
  )
}

export function MechanicPanel({
  workshopName,
  address,
  phone,
  specialtyLabels,
  hoursConfiguredDays,
  slotDurationMinutes,
  hasLocation,
  pendingTicketCount,
}: MechanicPanelProps) {
  const setupComplete = hasLocation && hoursConfiguredDays > 0 && specialtyLabels.length > 0
  const dayWord = hoursConfiguredDays === 1 ? 'día configurado' : 'días configurados'
  const hoursDetail =
    hoursConfiguredDays > 0
      ? `${hoursConfiguredDays} ${dayWord} — turnos cada ${slotDurationMinutes} min.`
      : 'Definí tus horarios para recibir reservas de turnos.'
  const ticketWord = pendingTicketCount === 1 ? 'ticket abierto' : 'tickets abiertos'
  const ticketBadgeText = pendingTicketCount > 0 ? `${pendingTicketCount} ${ticketWord}` : 'Sin tickets abiertos'

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14 px-4 sm:px-8">

          {/* Hero */}
          <motion.section {...enter(0)} className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-4">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Panel del taller
              </span>
              <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                {workshopName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5 text-muted-foreground/60" />
                  {address}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <PhoneIcon className="size-3 text-muted-foreground/60" />
                  {phone}
                </span>
              </div>
            </div>
            <Badge variant={setupComplete ? 'ok' : 'active'} className="shrink-0">
              <BadgeDot className={cn(!setupComplete && 'animate-pulse')} />
              {setupComplete ? 'Taller operativo' : 'Configuración incompleta'}
            </Badge>
          </motion.section>

          {/* Bento */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Setup checklist — wide cell */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              <motion.h2 {...enter(0.1)} className={cn(sectionLabel, 'px-1')}>
                Estado de configuración
              </motion.h2>
              <motion.div {...enter(0.16)} className="bezel">
                <div className="bezel-core flex flex-col gap-2 p-6 sm:p-7">
                  <div className="flex flex-col">
                    <ChecklistRow
                      ok={hasLocation}
                      label="Ubicación en el mapa"
                      detail={
                        hasLocation
                          ? 'Tu taller aparece en las búsquedas por cercanía.'
                          : 'Configurala para aparecer en las búsquedas por cercanía.'
                      }
                    />
                    <ChecklistRow
                      ok={hoursConfiguredDays > 0}
                      label="Horario de atención"
                      detail={hoursDetail}
                    />
                    <ChecklistRow
                      ok={specialtyLabels.length > 0}
                      label="Especialidades"
                      detail={
                        specialtyLabels.length > 0
                          ? specialtyLabels.join(' · ')
                          : 'Elegí tus especialidades para aparecer en los filtros de búsqueda.'
                      }
                    />
                  </div>
                  <div className="flex justify-end pt-3">
                    <Button asChild variant={setupComplete ? 'secondary' : 'default'}>
                      <Link href="/mechanic/settings">
                        Configurar taller
                        <ButtonIconIsland>
                          <ArrowUpRightIcon className="size-3.5" />
                        </ButtonIconIsland>
                      </Link>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Work orders */}
            <div className="flex flex-col gap-5 lg:col-span-5">
              <motion.h2 {...enter(0.14)} className={cn(sectionLabel, 'px-1')}>
                Órdenes de trabajo
              </motion.h2>
              <motion.div {...enter(0.2)} className="bezel flex-1">
                <div className="bezel-core flex h-full flex-col items-center justify-center gap-5 px-6 py-14 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                    <WrenchIcon className="size-6" />
                  </span>
                  <div className="flex flex-col items-center gap-2">
                    <Badge variant={pendingTicketCount > 0 ? 'active' : 'idle'}>{ticketBadgeText}</Badge>
                    <span className="max-w-2xs text-sm leading-relaxed text-muted-foreground">
                      Gestioná los turnos que llegan y las órdenes de trabajo en curso.
                    </span>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href="/mechanic/board">
                      Ir al tablero
                      <ButtonIconIsland>
                        <ArrowUpRightIcon className="size-3.5" />
                      </ButtonIconIsland>
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </section>
        </div>
      </main>
    </MotionConfig>
  )
}
