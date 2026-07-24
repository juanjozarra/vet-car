// app/(dashboard)/mechanic/board/Board.tsx
'use client'

import { useState } from 'react'
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

export function Board({ scheduledAppointments, tickets, mechanics }: BoardProps) {
  const [openTicket, setOpenTicket] = useState<TicketCardData | null>(null)

  function ticketsByStatus(status: WorkOrderStatus) {
    return tickets.filter(t => t.status === status)
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4">
        <h2 className={columnLabel}>Programado</h2>
        <div className="flex flex-col gap-3">
          {scheduledAppointments.map(a => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
          {scheduledAppointments.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin turnos pendientes de llegada.</p>
          )}
        </div>
      </div>
      {WORK_ORDER_STATUS_OPTIONS.map(({ value, label }) => (
        <div key={value} className="flex flex-col gap-4">
          <h2 className={columnLabel}>{label}</h2>
          <div className="flex flex-col gap-3">
            {ticketsByStatus(value).map(t => (
              <TicketCard key={t.id} ticket={t} onOpen={setOpenTicket} />
            ))}
            {ticketsByStatus(value).length === 0 && (
              <p className="text-xs text-muted-foreground">Sin tickets.</p>
            )}
          </div>
        </div>
      ))}
      <TicketDialog
        ticket={openTicket}
        mechanics={mechanics}
        onOpenChange={open => { if (!open) setOpenTicket(null) }}
      />
    </div>
  )
}
