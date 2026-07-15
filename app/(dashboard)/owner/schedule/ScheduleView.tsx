'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { cn } from '@/lib/utils'
import {
  ArrowUpRightIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  ServiceIcon,
  WrenchIcon,
} from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { AdvancedMarker, Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { GoogleMapsProvider, hasGoogleMapsKey } from '@/components/shared/GoogleMapsProvider'
import { WORKSHOP_SPECIALTY_LABELS, WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'

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

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

function centroidOf(points: { latitude: number; longitude: number }[]): LatLng | null {
  if (points.length === 0) return null
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.latitude, lng: acc.lng + p.longitude }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

// Google's public demo Map ID — required for Advanced Markers to render.
// ponytail: swap for a real Map ID from Cloud Console if custom map styling is ever needed.
const MAP_ID = 'DEMO_MAP_ID'

const BUENOS_AIRES: LatLng = { lat: -34.6037, lng: -58.3816 }

function WorkshopPin({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'relative flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-[0_8px_20px_-6px_rgba(242,179,80,0.6)] transition-transform duration-200 ease-out',
        selected && 'scale-125 ring-4 ring-primary/25'
      )}
    >
      <WrenchIcon className="size-3.5" />
      <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-primary" />
    </div>
  )
}

function UserLocationPin() {
  return (
    <div className="relative flex size-4 items-center justify-center">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400/60" />
      <span className="relative size-2.5 rounded-full border-2 border-white bg-sky-500" />
    </div>
  )
}

function MapPanel({
  workshops,
  userLocation,
  selectedWorkshopId,
  onSelectWorkshop,
}: {
  workshops: Workshop[]
  userLocation: LatLng | null
  selectedWorkshopId: string | null
  onSelectWorkshop: (workshop: Workshop) => void
}) {
  const map = useMap()
  const coreLib = useMapsLibrary('core')
  const mapsLib = useMapsLibrary('maps')

  const located = workshops.filter(
    (w): w is Workshop & { latitude: number; longitude: number } => w.latitude !== null && w.longitude !== null
  )
  const locatedKey = located.map(w => `${w.id}:${w.latitude},${w.longitude}`).join('|')
  const defaultCenter = userLocation ?? centroidOf(located) ?? BUENOS_AIRES

  // Recenter on the user's city (or the visible results) instead of leaving the map
  // zoomed out to fit every workshop in the country.
  useEffect(() => {
    if (!map || !coreLib) return
    if (userLocation) {
      map.panTo(userLocation)
      map.setZoom(14)
      return
    }
    if (located.length === 0) return
    const bounds = new coreLib.LatLngBounds()
    located.forEach(w => bounds.extend({ lat: w.latitude, lng: w.longitude }))
    map.fitBounds(bounds, 64)
    const listener = coreLib.event.addListenerOnce(map, 'bounds_changed', () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15)
    })
    return () => listener.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locatedKey stands in for `located`, an array recreated every render
  }, [map, coreLib, userLocation, locatedKey])

  // Transit lines/stations overlay; Google fades it out automatically at low zoom.
  useEffect(() => {
    if (!map || !mapsLib) return
    const layer = new mapsLib.TransitLayer()
    layer.setMap(map)
    return () => layer.setMap(null)
  }, [map, mapsLib])

  return (
    <Map
      mapId={MAP_ID}
      defaultZoom={userLocation ? 14 : 12}
      defaultCenter={defaultCenter}
      gestureHandling="greedy"
      mapTypeControl={false}
      fullscreenControl={false}
      className="h-full w-full"
    >
      {userLocation && (
        <AdvancedMarker position={userLocation} title="Tu ubicación">
          <UserLocationPin />
        </AdvancedMarker>
      )}
      {located.map(w => (
        <AdvancedMarker
          key={w.id}
          position={{ lat: w.latitude, lng: w.longitude }}
          title={w.name}
          onClick={() => onSelectWorkshop(w)}
        >
          <WorkshopPin selected={selectedWorkshopId === w.id} />
        </AdvancedMarker>
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
    <div className="group relative w-full sm:w-72">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
        <SearchIcon />
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
        aria-label="Buscar por ubicación"
        className="pl-10"
      />
      {error && (
        <p role="alert" className="absolute top-full mt-1.5 text-xs text-[#ffb3ae]">
          No encontramos esa ubicación.
        </p>
      )}
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
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: motionTokens.easing.fluid, delay: Math.min(index, 6) * 0.06 }}
      whileHover={{ y: -3, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      onClick={onSelect}
      className={cn(
        'bezel cursor-pointer transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isSelected &&
          'shadow-[0_0_0_1px_rgba(242,179,80,0.45),0_20px_50px_-20px_rgba(242,179,80,0.25)]'
      )}
    >
      <div className="bezel-core flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-display text-xl font-medium leading-tight tracking-[-0.01em] text-foreground">
              {workshop.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
              <span className="truncate">{workshop.address}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/70">
              <PhoneIcon className="size-3 shrink-0" />
              {workshop.phone}
            </span>
          </div>
          <div className="shrink-0">
            {workshop.distanceKm !== null ? (
              <Badge variant="active">{workshop.distanceKm.toFixed(1)} km</Badge>
            ) : workshop.latitude === null ? (
              <Badge variant="idle">Sin ubicación</Badge>
            ) : null}
          </div>
        </div>

        {workshop.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {workshop.specialties.map(s => (
              <Badge key={s} variant="outline" className="text-xs">
                {WORKSHOP_SPECIALTY_LABELS[s as keyof typeof WORKSHOP_SPECIALTY_LABELS] ?? s}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${
              workshop.latitude !== null && workshop.longitude !== null
                ? `${workshop.latitude},${workshop.longitude}`
                : encodeURIComponent(workshop.address)
            }&travelmode=transit`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <MapPinIcon className="size-3" />
            Cómo llegar
          </a>
          <Button
            onClick={e => {
              e.stopPropagation()
              onBook()
            }}
            variant="secondary"
            size="sm"
          >
            Agendar turno
            <ButtonIconIsland>
              <ArrowUpRightIcon className="size-3" />
            </ButtonIconIsland>
          </Button>
        </div>
      </div>
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

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          className="h-9 rounded-[0.625rem] bg-white/[0.05]"
        />
      ))}
    </div>
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
    <DialogContent className="w-full gap-6 p-7 sm:max-w-[720px] sm:p-8">
      <DialogHeader>
        <span className={fieldLabel}>Reserva de turno</span>
        <DialogTitle className="text-2xl">{workshop.name}</DialogTitle>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-3.5 text-muted-foreground/60" />
          {workshop.address}
        </span>
      </DialogHeader>

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-2">
          <span className="text-sm leading-relaxed text-muted-foreground">
            Todavía no tenés vehículos registrados. Registrá uno para poder agendar un turno.
          </span>
          <Link href="/owner/vehicles/new">
            <Button size="sm">
              Registrar vehículo
              <ButtonIconIsland>
                <PlusIcon className="size-3" />
              </ButtonIconIsland>
            </Button>
          </Link>
        </div>
      ) : loadingSlots ? (
        <div className="flex flex-col gap-3 py-2">
          <span className="text-sm text-muted-foreground">Buscando horarios disponibles…</span>
          <SlotSkeleton />
        </div>
      ) : !hasAnyAvailability ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] px-4 py-4 ring-1 ring-white/[0.06]">
          <span className="text-sm leading-relaxed text-muted-foreground">
            Este taller todavía no configuró su disponibilidad. Contactalo al{' '}
            <span className="font-mono text-foreground">{workshop.phone}</span> para coordinar un turno.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="vehicleId" className={fieldLabel}>Vehículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId} required>
                <SelectTrigger id="vehicleId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label className={fieldLabel}>Fecha</Label>
              <DatePicker
                selected={selectedDate}
                onSelect={date => { setSelectedDate(date); setSelectedSlot(null) }}
                isDayDisabled={date => (slotsByDate[dateKey(date)] ?? []).length === 0}
                minMonth={next14Days[0]}
                maxMonth={next14Days[next14Days.length - 1]}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <Label className={fieldLabel}>Horario</Label>
              {selectedDaySlots.length > 0 && (
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/50">
                  {selectedDaySlots.length} disponibles
                </span>
              )}
            </div>
            {selectedDaySlots.length === 0 ? (
              <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-muted-foreground ring-1 ring-white/[0.06]">
                No hay horarios disponibles ese día.
              </p>
            ) : (
              <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                {selectedDaySlots.map(slot => {
                  const isSelected = selectedSlot?.getTime() === slot.getTime()
                  return (
                    <button
                      key={slot.toISOString()}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      aria-pressed={isSelected}
                      className={cn(
                        'h-9 rounded-[0.625rem] font-mono text-xs outline-none transition-[background-color,color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/40',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgba(242,179,80,0.6)]'
                          : 'bg-white/[0.04] text-foreground ring-1 ring-white/[0.08] ring-inset hover:bg-white/[0.08]'
                      )}
                    >
                      {TIME_LABEL_FORMATTER.format(slot)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="notes" className={fieldLabel}>Tipo de servicio / notas (opcional)</Label>
            <Input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-5">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting || !selectedSlot}>
              {submitting ? 'Agendando…' : 'Confirmar turno'}
            </Button>
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
      <main className="flex-1 pt-32 sm:pt-36">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 sm:px-8">

          {/* Hero + filters */}
          <motion.section
            initial={{ opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: motionTokens.easing.fluid }}
            className="flex flex-col gap-7"
          >
            <div className="flex flex-col gap-4">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Agenda de turnos
              </span>
              <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
                Encontrá tu taller.
              </h1>
              <p className="max-w-lg text-base text-muted-foreground">
                Buscá por cercanía o especialidad y reservá en los horarios reales del taller.
              </p>
            </div>

            <div className="bezel w-full">
              <div className="bezel-core flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center">
                {hasGoogleMapsKey ? (
                  <GoogleMapsProvider>
                    <LocationSearchField onLocate={setUserLocation} />
                  </GoogleMapsProvider>
                ) : (
                  <div className="group relative w-full sm:w-72">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/40">
                      <SearchIcon />
                    </span>
                    <Input type="text" disabled placeholder="Búsqueda por ubicación no disponible" className="pl-10" />
                  </div>
                )}

                <div className="group relative flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted-foreground/60">
                    <ServiceIcon className="size-3.5" />
                  </span>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="w-full pl-9" aria-label="Tipo de servicio">
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

                <Button type="button" variant="secondary" onClick={requestGeolocation} className="shrink-0">
                  <MapPinIcon className="size-3.5" />
                  Usar mi ubicación
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Results + sticky map */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,42%)_1fr]">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                  Talleres disponibles
                </h2>
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/50">
                  {workshops.length.toString().padStart(2, '0')} resultados
                </span>
              </div>

              {workshops.length === 0 ? (
                <div className="bezel">
                  <div className="bezel-core flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                      <SearchIcon className="size-5" />
                    </span>
                    <span className="text-sm text-muted-foreground">
                      No encontramos talleres con esos filtros.
                    </span>
                  </div>
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

            <motion.div
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: motionTokens.easing.fluid, delay: 0.12 }}
              className="hidden lg:block"
            >
              <div className="bezel sticky top-28">
                <div className="bezel-core relative h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden">
                  {hasGoogleMapsKey ? (
                    <GoogleMapsProvider>
                      <MapPanel
                        workshops={workshops}
                        userLocation={userLocation}
                        selectedWorkshopId={selectedWorkshopId}
                        onSelectWorkshop={w => setSelectedWorkshopId(w.id)}
                      />
                    </GoogleMapsProvider>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                      <div
                        className="absolute inset-0 opacity-40"
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                          backgroundSize: '48px 48px',
                        }}
                      />
                      <span className="relative max-w-xs text-sm leading-relaxed text-muted-foreground">
                        El mapa no está disponible: falta configurar{' '}
                        <span className="font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span>.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </section>
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
