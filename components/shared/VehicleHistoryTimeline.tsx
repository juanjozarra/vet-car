'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WrenchIcon, OdometerIcon } from '@/components/ui/icons'
import { Badge, BadgeDot } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_ITEM_TYPE_LABELS } from '@/lib/serviceItemType'
import type { HistoryEntrySummary } from '@/lib/vehicleHistory'

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })

interface VehicleHistoryTimelineProps {
  entries: HistoryEntrySummary[]
  currentUserId: string
  basePath: string
}

export function VehicleHistoryTimeline({ entries, currentUserId, basePath }: VehicleHistoryTimelineProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setError(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('No se pudo eliminar el registro.')
        return
      }
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setDeletingId(null)
    }
  }

  if (entries.length === 0) {
    return (
      <div className="bezel">
        <div className="bezel-core flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
            <WrenchIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-medium text-foreground">Todavía no hay registros</span>
            <span className="text-sm text-muted-foreground">Agregá el primero para empezar el historial.</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
          {error}
        </p>
      )}
      {entries.map(entry => (
        <div key={entry.id} className="bezel">
          <div className="bezel-core flex flex-col gap-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08]">
                  <WrenchIcon className="size-4.5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{SERVICE_ITEM_TYPE_LABELS[entry.type]}</span>
                  <span className="text-xs text-muted-foreground">
                    {DATE_FORMATTER.format(new Date(entry.performedAt))}
                  </span>
                </div>
              </div>
              <Badge variant={entry.source === 'MECHANIC' ? 'ok' : 'idle'}>
                <BadgeDot />
                {entry.source === 'MECHANIC'
                  ? `Registrado por ${entry.workshopName ?? 'el taller'}`
                  : 'Reportado por el dueño'}
              </Badge>
            </div>

            <p className="text-sm text-foreground/90">{entry.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {entry.odometerReading !== null && (
                <span className="flex items-center gap-1.5">
                  <OdometerIcon className="size-3.5" />
                  {entry.odometerReading.toLocaleString('es-AR')} km
                </span>
              )}
              {entry.cost !== null && <span>${entry.cost.toLocaleString('es-AR')}</span>}
            </div>

            {entry.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.photoUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
            )}

            {entry.createdById === currentUserId && (
              <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${basePath}/history/${entry.id}/edit`}>Editar</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deletingId === entry.id}
                  onClick={() => handleDelete(entry.id)}
                >
                  {deletingId === entry.id ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
