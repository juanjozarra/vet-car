'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  MapPinIcon, ServiceIcon, FilterIcon, SearchIcon,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const MotionButton = motion.create(Button)

type Workshop = { id: string; name: string; address: string; phone: string }
type VehicleOption = { id: string; label: string }

interface ScheduleViewProps {
  workshops: Workshop[]
  vehicles: VehicleOption[]
}

// ponytail: static decorative pins — not tied to real workshop coordinates.
// Wire Mapbox/Google Maps here once we have geocoding for workshop addresses.
const MAP_PINS = [
  { top: '28%', left: '38%' },
  { top: '52%', left: '64%' },
  { top: '68%', left: '30%' },
]

function ShopCard({ workshop, index, onBook }: { workshop: Workshop; index: number; onBook: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: index * 0.06 }}
      whileHover={{ y: -2, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
    >
      <Card className="p-[1.0625rem] gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-lg font-bold text-foreground">{workshop.name}</span>
            <span className="text-sm text-muted-foreground">{workshop.address}</span>
            {/* ponytail: rating badge omitted — Workshop has no rating field yet */}
            <span className="text-xs text-muted-foreground">Tel: {workshop.phone}</span>
          </div>
        </div>
        {/* ponytail: service-type tag chips omitted — no service catalog data on Workshop yet */}
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <MotionButton
            onClick={onBook}
            whileHover={{ scale: 1.03, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            variant="outline"
            className="h-8 px-[1.0625rem] border-primary text-primary text-[0.625rem] tracking-[0.05em] uppercase hover:bg-primary/10 hover:text-primary"
          >
            Agendar
          </MotionButton>
        </div>
      </Card>
    </motion.div>
  )
}

function BookingModal({
  workshop, vehicles, onClose,
}: {
  workshop: Workshop
  vehicles: VehicleOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          workshopId: workshop.id,
          title: `Turno en ${workshop.name}`,
          scheduledAt,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogContent className="w-full max-w-[420px] p-6 gap-4 rounded-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-foreground">Agendar turno</DialogTitle>
        <span className="text-sm text-muted-foreground">{workshop.name}</span>
      </DialogHeader>

      {vehicles.length === 0 ? (
        <div className="flex flex-col gap-3 items-start py-2">
          <span className="text-sm text-muted-foreground">Todavía no tenés vehículos registrados. Registrá uno para poder agendar un turno.</span>
          <Link href="/owner/vehicles/new">
            <Button className="h-10 px-4 text-xs tracking-[0.037em]">Registrar vehículo</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vehicleId" className="text-sm font-medium text-muted-foreground">Vehículo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId} required>
              <SelectTrigger id="vehicleId" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledAt" className="text-sm font-medium text-muted-foreground">Fecha y hora</Label>
            <Input id="scheduledAt" type="datetime-local" value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)} required className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Tipo de servicio / notas (opcional)</Label>
            <Input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
              value={notes} onChange={e => setNotes(e.target.value)} className="h-11" />
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">Cancelar</Button>
            <MotionButton type="submit" disabled={submitting}
              whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
              whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
              className="h-10 px-4 text-xs tracking-[0.037em]">
              {submitting ? 'Agendando…' : 'Confirmar turno'}
            </MotionButton>
          </div>
        </form>
      )}
    </DialogContent>
  )
}

export function ScheduleView({ workshops, vehicles }: ScheduleViewProps) {
  const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(null)

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16 flex flex-col overflow-hidden">

        {/* Search & Filter Bar — ponytail: inputs/buttons are visual placeholders, wiring real search/filtering is out of scope for now */}
        <div className="flex items-center justify-between gap-4 py-4 px-8 bg-[#0c0f0f] border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <MapPinIcon />
              </span>
              <Input
                type="text"
                placeholder="Ubicación (p. ej. Palermo, CABA)"
                className="w-72 h-10 pl-9"
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                <ServiceIcon />
              </span>
              <Select>
                <SelectTrigger className="w-64 h-10 pl-9">
                  <SelectValue placeholder="Tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Reparación</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="upgrade">Mejora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" className="h-10 px-4 font-mono text-xs tracking-[0.05em] uppercase">
              <FilterIcon />
              Más filtros
            </Button>
            <Button className="h-10 px-6 text-xs font-bold tracking-[0.05em] uppercase">
              <SearchIcon />
              Buscar
            </Button>
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-[0_1_533px] min-w-[380px] bg-background border-r border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] uppercase font-mono">Talleres disponibles</h1>
              <span className="text-xs text-muted-foreground tracking-[0.05em] uppercase whitespace-nowrap">{workshops.length} resultados</span>
            </div>

            {workshops.length === 0 ? (
              <div className="flex items-center justify-center text-center py-12 px-4 bg-card border border-dashed border-border rounded-lg">
                <span className="text-sm text-muted-foreground">Todavía no hay talleres registrados en la plataforma.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {workshops.map((w, i) => (
                  <ShopCard key={w.id} workshop={w} index={i} onBook={() => setActiveWorkshop(w)} />
                ))}
              </div>
            )}
          </div>

          {/* Map View — ponytail: static placeholder panel, wire Mapbox/Google Maps for real geo */}
          <div className="relative flex-1 min-w-[300px] bg-card overflow-hidden">
            <div
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #3c494a 1px, transparent 1px), linear-gradient(to bottom, #3c494a 1px, transparent 1px), radial-gradient(circle at 50% 40%, rgba(85,216,225,0.08), transparent 60%)',
                backgroundSize: '48px 48px, 48px 48px, 100% 100%',
              }}
            />
            {MAP_PINS.map((pos, i) => (
              <div key={i} className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-full" style={{ top: pos.top, left: pos.left }}>
                <div className="size-10 rounded-lg bg-muted border-2 border-primary" />
                <div className="size-2 -mt-1 bg-muted border-r-2 border-b-2 border-primary rotate-45" />
              </div>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={activeWorkshop !== null} onOpenChange={open => !open && setActiveWorkshop(null)}>
        {activeWorkshop && (
          <BookingModal
            workshop={activeWorkshop}
            vehicles={vehicles}
            onClose={() => setActiveWorkshop(null)}
          />
        )}
      </Dialog>
    </MotionConfig>
  )
}
