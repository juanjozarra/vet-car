'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { WORK_ORDER_STATUS_OPTIONS } from '@/lib/workOrderStatus'
import type { WorkOrderStatus } from '@prisma/client'

export interface TicketCardData {
  id: string
  title: string
  description: string | null
  status: WorkOrderStatus
  vehicleId: string
  vehicleLabel: string
  mechanicId: string
  mechanicName: string
}

interface TicketCardProps {
  ticket: TicketCardData
  onOpen: (ticket: TicketCardData) => void
}

export function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="bezel">
      <div className="bezel-core flex flex-col gap-3 p-4">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <button type="button" onClick={() => onOpen(ticket)} className="flex flex-col gap-1 text-left outline-none">
          <span className="text-sm font-medium text-foreground">{ticket.vehicleLabel}</span>
          <span className="text-xs text-muted-foreground">{ticket.title}</span>
        </button>
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="bg-white/[0.06]">
            <AvatarFallback className="bg-white/[0.06] font-mono text-[0.625rem] font-semibold text-primary">
              {getInitials(ticket.mechanicName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">{ticket.mechanicName}</span>
        </div>
        <Select value={ticket.status} onValueChange={handleStatusChange} disabled={updating}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_ORDER_STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
