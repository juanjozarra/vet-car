'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ClockIcon } from '@/components/ui/icons'
import { SLOT_DATE_TIME_FORMATTER } from '@/lib/availability'

export interface AppointmentCardData {
  id: string
  title: string
  scheduledAt: string
  vehicleLabel: string
  ownerName: string
}

export function AppointmentCard({ appointment }: { appointment: AppointmentCardData }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckIn() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/check-in`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo registrar la llegada')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
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
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          {SLOT_DATE_TIME_FORMATTER.format(new Date(appointment.scheduledAt))}
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{appointment.vehicleLabel}</span>
          <span className="text-xs text-muted-foreground">{appointment.ownerName}</span>
        </div>
        <Button size="sm" disabled={loading} onClick={handleCheckIn} className="w-full">
          {loading ? 'Registrando…' : 'Registrar llegada'}
        </Button>
      </div>
    </div>
  )
}
