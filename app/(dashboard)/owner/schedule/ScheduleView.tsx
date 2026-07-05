'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { cn } from '@/lib/utils'
import {
  MapPinIcon, ServiceIcon,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { Map, Marker, useMapsLibrary } from '@vis.gl/react-google-maps'
import { GoogleMapsProvider, hasGoogleMapsKey } from '@/components/shared/GoogleMapsProvider'
import { WORKSHOP_SPECIALTY_LABELS, WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'

const MotionButton = motion.create(Button)

type Workshop = {
  id: string
  name: string
  address: string
  phone: string
  specialties: string[]
  latitude: number | null
  longitude: number | null
  distanceKm: number | null
}
type VehicleOption = { id: string; label: string }
type LatLng = { lat: number; lng: number }

interface ScheduleViewProps {
  workshops: Workshop[]
  vehicles: VehicleOption[]
}

function centroidOf(points: { latitude: number; longitude: number }[]): LatLng | null {
  if (points.length === 0) return null
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

function MapPanel({
  workshops,
  userLocation,
  onSelectWorkshop,
}: {
  workshops: Workshop[]
  userLocation: LatLng | null
  onSelectWorkshop: (workshop: Workshop) => void
}) {
  const located = workshops.filter(
    (w): w is Workshop & { latitude: number; longitude: number } => w.latitude !== null && w.longitude !== null
  )
  const defaultCenter = userLocation ?? centroidOf(located) ?? { lat: 0, lng: 0 }

  return (
    <Map
      defaultZoom={userLocation ? 13 : 4}
      defaultCenter={defaultCenter}
      gestureHandling="greedy"
      disableDefaultUI
      className="w-full h-full"
    >
      {userLocation && <Marker position={userLocation} title="Tu ubicación" />}
      {located.map(w => (
        <Marker
          key={w.id}
          position={{ lat: w.latitude, lng: w.longitude }}
          title={w.name}
          clickable
          onClick={() => onSelectWorkshop(w)}
        />
      ))}
    </Map>
  )
}

function LocationSearchField({ onLocate }: { onLocate: (coords: LatLng) => void }) {
  const geocodingLib = useMapsLibrary('geocoding')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!geocodingLib || !value.trim()) return
    setError(false)
    const geocoder = new geocodingLib.Geocoder()
    try {
      const { results } = await geocoder.geocode({ address: value })
      const first = results[0]
      if (!first) {
        setError(true)
        return
      }
      onLocate({ lat: first.geometry.location.lat(), lng: first.geometry.location.lng() })
    } catch {
      setError(true)
    }
  }, [geocodingLib, value, onLocate])

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        <MapPinIcon />
      </span>
      <Input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSearch()
          }
        }}
        placeholder="Ubicación (p. ej. Palermo, CABA)"
        className="w-72 h-10 pl-9"
      />
      {error && <p className="absolute top-full mt-1 text-xs text-destructive-foreground">No encontramos esa ubicación.</p>}
    </div>
  )
}

function ShopCard({
  workshop, index, isSelected, onSelect, onBook,
}: {
  workshop: Workshop; index: number; isSelected: boolean; onSelect: () => void; onBook: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: index * 0.06 }}
      whileHover={{ y: -2, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      onClick={onSelect}
    >
      <Card className={cn('p-[1.0625rem] gap-2 cursor-pointer', isSelected && 'ring-2 ring-primary')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-lg font-bold text-foreground">{workshop.name}</span>
            <span className="text-sm text-muted-foreground">{workshop.address}</span>
            <span className="text-xs text-muted-foreground">Tel: {workshop.phone}</span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {workshop.distanceKm !== null ? (
              <Badge variant="idle">{workshop.distanceKm.toFixed(1)} km</Badge>
            ) : workshop.latitude === null ? (
              <Badge variant="outline">Ubicación no disponible</Badge>
            ) : null}
          </div>
        </div>
        {workshop.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workshop.specialties.map(s => (
              <Badge key={s} variant="outline">
                {WORKSHOP_SPECIALTY_LABELS[s as keyof typeof WORKSHOP_SPECIALTY_LABELS] ?? s}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <MotionButton
            onClick={e => { e.stopPropagation(); onBook() }}
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

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function groupSlotsByDate(slots: string[]): Record<string, Date[]> {
  const grouped: Record<string, Date[]> = {}
  for (const iso of slots) {
    const date = new Date(iso)
    const key = dateKey(date)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(date)
  }
  return grouped
}

const TIME_LABEL_FORMATTER = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

function BookingModal({
  workshop, vehicles, onClose,
}: {
  workshop: Workshop
  vehicles: VehicleOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loadingSlots, setLoadingSlots] = useState(true)
  const [slotsByDate, setSlotsByDate] = useState<Record<string, Date[]>>({})
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)

  const next14Days = useMemo(() => {
    const days: Date[] = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      days.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i))
    }
    return days
  }, [])

  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/workshops/${workshop.id}/availability`)
      const data = await res.json()
      const grouped = groupSlotsByDate((data.slots ?? []) as string[])
      setSlotsByDate(grouped)
      setSelectedDate(prev => prev ?? next14Days.find(d => (grouped[dateKey(d)] ?? []).length > 0) ?? null)
    } finally {
      setLoadingSlots(false)
    }
  }, [workshop.id, next14Days])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; loadAvailability itself calls setState
    loadAvailability()
  }, [loadAvailability])

  const hasAnyAvailability = Object.keys(slotsByDate).length > 0
  const selectedDaySlots = selectedDate ? slotsByDate[dateKey(selectedDate)] ?? [] : []

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedSlot) {
      setError('Elegí un horario disponible.')
      return
    }
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
          scheduledAt: selectedSlot.toISOString(),
          notes: notes || undefined,
        }),
      })
      if (res.status === 409) {
        setError('Ese horario ya fue reservado. Elegí otro.')
        setSelectedSlot(null)
        await loadAvailability()
        return
      }
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
    <DialogContent className="w-full sm:max-w-[720px] p-6 gap-4 rounded-2xl">
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
      ) : loadingSlots ? (
        <p className="text-sm text-muted-foreground py-4">Buscando horarios disponibles…</p>
      ) : !hasAnyAvailability ? (
        <div className="flex flex-col gap-2 py-2">
          <span className="text-sm text-muted-foreground">
            Este taller todavía no configuró su disponibilidad. Contactalo al {workshop.phone} para coordinar un turno.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
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
            <Label className="text-sm font-medium text-muted-foreground">Fecha</Label>
            <DatePicker
              selected={selectedDate}
              onSelect={date => { setSelectedDate(date); setSelectedSlot(null) }}
              isDayDisabled={date => (slotsByDate[dateKey(date)] ?? []).length === 0}
              minMonth={next14Days[0]}
              maxMonth={next14Days[next14Days.length - 1]}
              className="w-56"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-muted-foreground">Horario</Label>
            {selectedDaySlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay horarios disponibles ese día.</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {selectedDaySlots.map(slot => {
                  const isSelected = selectedSlot?.getTime() === slot.getTime()
                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-xs font-mono',
                        isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:border-primary/60'
                      )}
                    >
                      {TIME_LABEL_FORMATTER.format(slot)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Tipo de servicio / notas (opcional)</Label>
            <Input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
              value={notes} onChange={e => setNotes(e.target.value)} className="h-11" />
          </div>

          {error && <p className="text-sm text-destructive-foreground">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">Cancelar</Button>
            <MotionButton type="submit" disabled={submitting || !selectedSlot}
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

export function ScheduleView({ workshops: initialWorkshops, vehicles }: ScheduleViewProps) {
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops)
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [specialty, setSpecialty] = useState('all')
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null)
  const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(null)

  const fetchWorkshops = useCallback(async (coords: LatLng | null) => {
    const params = new URLSearchParams()
    if (coords) {
      params.set('lat', String(coords.lat))
      params.set('lng', String(coords.lng))
    }
    if (specialty !== 'all') params.set('specialty', specialty)
    const res = await fetch(`/api/workshops/search?${params.toString()}`)
    if (res.ok) setWorkshops(await res.json())
  }, [specialty])

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-dependency-change; fetchWorkshops itself calls setWorkshops
    fetchWorkshops(userLocation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, userLocation])

  function requestGeolocation() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16 flex flex-col overflow-hidden">

        <div className="flex items-center justify-between gap-4 py-4 px-8 bg-[#0c0f0f] border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            {hasGoogleMapsKey ? (
              <GoogleMapsProvider>
                <LocationSearchField onLocate={setUserLocation} />
              </GoogleMapsProvider>
            ) : (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <MapPinIcon />
                </span>
                <Input type="text" disabled placeholder="Búsqueda por ubicación no disponible" className="w-72 h-10 pl-9" />
              </div>
            )}
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                <ServiceIcon />
              </span>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="w-64 h-10 pl-9">
                  <SelectValue placeholder="Tipo de servicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los servicios</SelectItem>
                  {WORKSHOP_SPECIALTY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={requestGeolocation} className="h-10 px-4 font-mono text-xs tracking-[0.05em] uppercase">
              <MapPinIcon />
              Usar mi ubicación
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-[0_1_533px] min-w-[380px] bg-background border-r border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] uppercase font-mono">Talleres disponibles</h1>
              <span className="text-xs text-muted-foreground tracking-[0.05em] uppercase whitespace-nowrap">{workshops.length} resultados</span>
            </div>

            {workshops.length === 0 ? (
              <div className="flex items-center justify-center text-center py-12 px-4 bg-card border border-dashed border-border rounded-lg">
                <span className="text-sm text-muted-foreground">No encontramos talleres con esos filtros.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {workshops.map((w, i) => (
                  <ShopCard
                    key={w.id}
                    workshop={w}
                    index={i}
                    isSelected={selectedWorkshopId === w.id}
                    onSelect={() => setSelectedWorkshopId(w.id)}
                    onBook={() => setActiveWorkshop(w)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 min-w-[300px] bg-card overflow-hidden">
            {hasGoogleMapsKey ? (
              <GoogleMapsProvider>
                <MapPanel
                  workshops={workshops}
                  userLocation={userLocation}
                  onSelectWorkshop={w => setSelectedWorkshopId(w.id)}
                />
              </GoogleMapsProvider>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center px-8">
                <div
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, #3c494a 1px, transparent 1px), linear-gradient(to bottom, #3c494a 1px, transparent 1px)',
                    backgroundSize: '48px 48px',
                  }}
                />
                <span className="relative text-sm text-muted-foreground max-w-xs">
                  El mapa no está disponible: falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                </span>
              </div>
            )}
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
