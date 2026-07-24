'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TicketCardData } from './TicketCard'

interface Mechanic {
  id: string
  name: string | null
  email: string
}

interface TicketDialogProps {
  ticket: TicketCardData | null
  mechanics: Mechanic[]
  onOpenChange: (open: boolean) => void
}

function TicketDialogForm({
  ticket,
  mechanics,
  onOpenChange,
}: {
  ticket: TicketCardData
  mechanics: Mechanic[]
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description ?? '')
  const [mechanicId, setMechanicId] = useState(ticket.mechanicId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/workorders/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, mechanicId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo guardar')
        return
      }
      onOpenChange(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{ticket.vehicleLabel}</DialogTitle>
        <DialogDescription>
          <Link href={`/mechanic/vehicles/${ticket.vehicleId}`} className="underline underline-offset-2">
            Ver vehículo
          </Link>
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-title">Título</Label>
          <Input id="ticket-title" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-description">Descripción</Label>
          <Textarea id="ticket-description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-mechanic">Mecánico asignado</Label>
          <Select value={mechanicId} onValueChange={setMechanicId}>
            <SelectTrigger id="ticket-mechanic" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mechanics.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function TicketDialog({ ticket, mechanics, onOpenChange }: TicketDialogProps) {
  return (
    <Dialog open={ticket !== null} onOpenChange={open => { if (!open) onOpenChange(false) }}>
      {ticket && (
        <TicketDialogForm key={ticket.id} ticket={ticket} mechanics={mechanics} onOpenChange={onOpenChange} />
      )}
    </Dialog>
  )
}
