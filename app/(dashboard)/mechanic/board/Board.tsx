// app/(dashboard)/mechanic/board/Board.tsx
'use client'

import { useState } from 'react'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { AppointmentCard, type AppointmentCardData } from './AppointmentCard'
import { TicketCard, type TicketCardData } from './TicketCard'
import { TicketDialog } from './TicketDialog'
import { WORK_ORDER_STATUS_OPTIONS } from '@/lib/workOrderStatus'
import type { WorkOrderStatus } from '@prisma/client'

interface Mechanic {
  id: string
  name: string | null
  email: string
}

interface BoardProps {
  scheduledAppointments: AppointmentCardData[]
  tickets: TicketCardData[]
  mechanics: Mechanic[]
}

const columnLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'

const enter = (delay: number) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})

export function Board({ scheduledAppointments, tickets, mechanics }: BoardProps) {
  const [openTicket, setOpenTicket] = useState<TicketCardData | null>(null)

  function ticketsByStatus(status: WorkOrderStatus) {
    return tickets.filter(t => t.status === status)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8">
        <motion.div {...enter(0)} className="flex flex-col gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Tablero
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Turnos y órdenes de trabajo.
          </h1>
        </motion.div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <motion.div {...enter(0.1)} className="flex flex-col gap-4">
            <h2 className={columnLabel}>Programado</h2>
            <div className="flex flex-col gap-3">
              {scheduledAppointments.map(a => (
                <AppointmentCard key={a.id} appointment={a} />
              ))}
              {scheduledAppointments.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin turnos pendientes de llegada.</p>
              )}
            </div>
          </motion.div>
          {WORK_ORDER_STATUS_OPTIONS.map(({ value, label }, i) => (
            <motion.div key={value} {...enter(0.14 + i * 0.04)} className="flex flex-col gap-4">
              <h2 className={columnLabel}>{label}</h2>
              <div className="flex flex-col gap-3">
                {ticketsByStatus(value).map(t => (
                  <TicketCard key={t.id} ticket={t} onOpen={setOpenTicket} />
                ))}
                {ticketsByStatus(value).length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin tickets.</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <TicketDialog
        ticket={openTicket}
        mechanics={mechanics}
        onOpenChange={open => { if (!open) setOpenTicket(null) }}
      />
    </MotionConfig>
  )
}
