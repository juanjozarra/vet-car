// app/(dashboard)/mechanic/board/Board.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { enter } from '@/lib/motionTokens'
import { cn } from '@/lib/utils'
import { AppointmentCard, type AppointmentCardData } from './AppointmentCard'
import { TicketCard, TicketCardBody, type TicketCardData } from './TicketCard'
import { TicketDialog } from './TicketDialog'
import { ReceiveVehicleDialog, type WorkshopVehicleOption } from './ReceiveVehicleDialog'
import { WORK_ORDER_STATUS_OPTIONS, WORK_ORDER_STATUS_DOT_CLASS } from '@/lib/workOrderStatus'
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
  workshopVehicles: WorkshopVehicleOption[]
}

const columnLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'

function StatusColumn({
  status,
  label,
  tickets,
  onOpen,
}: {
  status: WorkOrderStatus
  label: string
  tickets: TicketCardData[]
  onOpen: (ticket: TicketCardData) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className={cn('size-1.5 rounded-full', WORK_ORDER_STATUS_DOT_CLASS[status])} aria-hidden="true" />
        <h2 className={columnLabel}>{label}</h2>
        <span className="ml-auto font-mono text-[0.625rem] text-muted-foreground/50">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-col gap-3 rounded-[1.75rem] p-1.5 transition-colors duration-150',
          isOver && 'bg-white/[0.05] ring-1 ring-primary/30'
        )}
      >
        {tickets.map(t => (
          <TicketCard key={t.id} ticket={t} onOpen={onOpen} />
        ))}
        {tickets.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">Sin tickets.</p>
        )}
      </div>
    </div>
  )
}

export function Board({ scheduledAppointments, tickets, mechanics, workshopVehicles }: Readonly<BoardProps>) {
  const router = useRouter()
  const [ticketList, setTicketList] = useState(tickets)
  const [syncedTickets, setSyncedTickets] = useState(tickets)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openTicket, setOpenTicket] = useState<TicketCardData | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Reset local (optimistic) ticket state whenever the server sends fresh props.
  if (tickets !== syncedTickets) {
    setSyncedTickets(tickets)
    setTicketList(tickets)
  }

  const activeTicket = activeId ? ticketList.find(t => t.id === activeId) ?? null : null

  function ticketsByStatus(status: WorkOrderStatus) {
    return ticketList.filter(t => t.status === status)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id))
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const status = over.id as WorkOrderStatus
    const ticket = ticketList.find(t => t.id === active.id)
    if (!ticket || ticket.status === status) return

    const previous = ticketList
    setTicketList(list => list.map(t => (t.id === ticket.id ? { ...t, status } : t)))
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        setTicketList(previous)
        return
      }
      router.refresh()
    } catch {
      setTicketList(previous)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8">
        <motion.div {...enter(0)} className="flex flex-col gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Tablero
          </span>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
              Turnos y órdenes de trabajo.
            </h1>
            <ReceiveVehicleDialog vehicles={workshopVehicles} />
          </div>
        </motion.div>
        <DndContext
          id="mechanic-board"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
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
              <motion.div key={value} {...enter(0.14 + i * 0.04)}>
                <StatusColumn status={value} label={label} tickets={ticketsByStatus(value)} onOpen={setOpenTicket} />
              </motion.div>
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.32,0.72,0,1)' }}>
            {activeTicket && (
              <div className="bezel rotate-1 shadow-2xl">
                <div className="bezel-core flex flex-col gap-3 p-4">
                  <TicketCardBody ticket={activeTicket} />
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
      <TicketDialog
        ticket={openTicket}
        mechanics={mechanics}
        onOpenChange={open => { if (!open) setOpenTicket(null) }}
      />
    </MotionConfig>
  )
}
