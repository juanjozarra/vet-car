'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { GripIcon, ServiceIcon } from '@/components/ui/icons'
import { cn, getInitials } from '@/lib/utils'
import {
  WORK_ORDER_STATUS_OPTIONS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_BADGE_VARIANT,
  WORK_ORDER_PROGRESS_STAGE_OPTIONS,
  WORK_ORDER_PROGRESS_STAGE_ORDER,
} from '@/lib/workOrderStatus'
import { SERVICE_ITEM_TYPE_LABELS } from '@/lib/serviceItemType'
import type { WorkOrderStatus, ServiceItemType, WorkOrderProgressStage } from '@prisma/client'

export interface TicketCardData {
  id: string
  title: string
  description: string | null
  status: WorkOrderStatus
  progressStage: WorkOrderProgressStage | null
  vehicleId: string
  vehicleLabel: string
  vehiclePlate: string | null
  mechanicId: string
  mechanicName: string
  serviceItems: { id: string; type: ServiceItemType }[]
  createdAt: string
}

interface TicketCardProps {
  ticket: TicketCardData
  onOpen: (ticket: TicketCardData) => void
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' })

function serviceItemCounts(items: TicketCardData['serviceItems']) {
  const counts = new Map<ServiceItemType, number>()
  for (const item of items) counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
  return Array.from(counts, ([type, count]) => ({ type, count }))
}

export function TicketCardBody({
  ticket,
  onOpen,
  dragHandle,
}: {
  ticket: TicketCardData
  onOpen?: (ticket: TicketCardData) => void
  dragHandle?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={WORK_ORDER_STATUS_BADGE_VARIANT[ticket.status]}>
          <BadgeDot />
          {WORK_ORDER_STATUS_LABELS[ticket.status]}
        </Badge>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] text-muted-foreground/60">
            {DATE_FORMATTER.format(new Date(ticket.createdAt))}
          </span>
          {dragHandle}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen ? () => onOpen(ticket) : undefined}
        className="flex flex-col gap-1 text-left outline-none"
      >
        <span className="font-display text-base font-medium leading-tight text-foreground">
          {ticket.vehicleLabel}
        </span>
        <span className="text-xs text-muted-foreground">{ticket.title}</span>
      </button>
      {ticket.vehiclePlate && (
        <span className="w-fit rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground ring-1 ring-white/[0.08] ring-inset">
          {ticket.vehiclePlate}
        </span>
      )}
      {ticket.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground/80">{ticket.description}</p>
      )}
      {ticket.serviceItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {serviceItemCounts(ticket.serviceItems).map(({ type, count }) => (
            <Badge key={type} variant="outline" className="gap-1 normal-case">
              <ServiceIcon className="size-3" />
              {SERVICE_ITEM_TYPE_LABELS[type]}
              {count > 1 ? ` ×${count}` : ''}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Avatar size="sm" className="bg-white/[0.06]">
          <AvatarFallback className="bg-white/[0.06] font-mono text-[0.625rem] font-semibold text-primary">
            {getInitials(ticket.mechanicName)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-xs text-muted-foreground">{ticket.mechanicName}</span>
      </div>
    </div>
  )
}

export function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id })

  async function handleStatusChange(status: string) {
    setError(null)
    setUpdating(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo actualizar el estado')
        return
      }
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  async function handleProgressStageChange(progressStage: string) {
    setError(null)
    setUpdating(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressStage }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo actualizar la etapa')
        return
      }
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'bezel transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-1',
        isDragging && 'opacity-30'
      )}
    >
      <div className="bezel-core flex flex-col gap-3 p-4">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <TicketCardBody
          ticket={ticket}
          onOpen={onOpen}
          dragHandle={
            <span
              {...listeners}
              {...attributes}
              role="button"
              tabIndex={-1}
              aria-label="Arrastrar para cambiar de estado"
              className="touch-none text-muted-foreground/40 outline-none hover:text-foreground active:cursor-grabbing"
            >
              <GripIcon className="size-3.5 cursor-grab" />
            </span>
          }
        />
        <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updating}>
          <SelectTrigger className="w-full" size="sm" aria-label="Estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_ORDER_STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ticket.status === 'IN_PROGRESS' && (
          <Select
            value={ticket.progressStage ?? WORK_ORDER_PROGRESS_STAGE_ORDER[0]}
            onValueChange={handleProgressStageChange}
            disabled={updating}
          >
            <SelectTrigger className="w-full" size="sm" aria-label="Etapa de progreso">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
