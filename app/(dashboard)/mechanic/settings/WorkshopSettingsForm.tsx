'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MotionConfig } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'
import { PlaceLocationInput, type PlaceLocationValue } from '@/components/shared/PlaceLocationInput'
import { GoogleMapsProvider } from '@/components/shared/GoogleMapsProvider'

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const SLOT_DURATIONS = [30, 45, 60, 90, 120]

interface DayRow {
  dayOfWeek: number
  enabled: boolean
  opensTime: string
  closesTime: string
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

interface WorkshopSettingsFormProps {
  initialSpecialties: string[]
  initialSlotDurationMinutes: number
  initialAddress: string
  initialLatitude: number | null
  initialLongitude: number | null
  initialHours: { dayOfWeek: number; opensMinute: number; closesMinute: number }[]
}

export function WorkshopSettingsForm({
  initialSpecialties,
  initialSlotDurationMinutes,
  initialAddress,
  initialLatitude,
  initialLongitude,
  initialHours,
}: WorkshopSettingsFormProps) {
  const router = useRouter()
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties)
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes)
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: initialAddress,
    latitude: initialLatitude ?? 0,
    longitude: initialLongitude ?? 0,
    googlePlaceId: null,
  })
  const [hasLocation, setHasLocation] = useState(initialLatitude !== null && initialLongitude !== null)
  const [days, setDays] = useState<DayRow[]>(() =>
    DAY_ORDER.map(dayOfWeek => {
      const existing = initialHours.find(h => h.dayOfWeek === dayOfWeek)
      return {
        dayOfWeek,
        enabled: Boolean(existing),
        opensTime: existing ? minutesToTime(existing.opensMinute) : '09:00',
        closesTime: existing ? minutesToTime(existing.closesMinute) : '18:00',
      }
    })
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggleSpecialty(value: string) {
    setSpecialties(prev => (prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]))
  }

  function updateDay(dayOfWeek: number, patch: Partial<DayRow>) {
    setDays(prev => prev.map(d => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const enabledDays = days.filter(d => d.enabled)
    for (const d of enabledDays) {
      if (timeToMinutes(d.opensTime) >= timeToMinutes(d.closesTime)) {
        setError(`El horario de ${DAY_LABELS[d.dayOfWeek]} es inválido: el cierre debe ser después de la apertura.`)
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/workshop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties,
          slotDurationMinutes,
          address: location.address,
          latitude: hasLocation ? location.latitude : undefined,
          longitude: hasLocation ? location.longitude : undefined,
          googlePlaceId: location.googlePlaceId,
          hours: enabledDays.map(d => ({
            dayOfWeek: d.dayOfWeek,
            opensMinute: timeToMinutes(d.opensTime),
            closesMinute: timeToMinutes(d.closesTime),
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo guardar la configuración')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Especialidades</h2>
          <div className="grid grid-cols-2 gap-2">
            {WORKSHOP_SPECIALTY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox
                  checked={specialties.includes(opt.value)}
                  onCheckedChange={() => toggleSpecialty(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Ubicación</h2>
          <GoogleMapsProvider>
            <PlaceLocationInput
              initialAddress={initialAddress}
              initialLatitude={initialLatitude}
              initialLongitude={initialLongitude}
              onSelect={value => {
                setLocation(value)
                setHasLocation(true)
              }}
            />
          </GoogleMapsProvider>
          {!hasLocation && (
            <p className="text-xs text-muted-foreground">
              Todavía no configuraste la ubicación del taller: no vas a aparecer en el mapa de búsqueda hasta que lo hagas.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Duración del turno</h2>
          <Select value={String(slotDurationMinutes)} onValueChange={v => setSlotDurationMinutes(Number(v))}>
            <SelectTrigger className="h-11 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_DURATIONS.map(d => (
                <SelectItem key={d} value={String(d)}>{d} minutos</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-[0.08em] uppercase text-foreground font-mono">Horario de atención</h2>
          <div className="flex flex-col gap-2">
            {days.map(day => (
              <div key={day.dayOfWeek} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-32 text-sm text-foreground cursor-pointer shrink-0">
                  <Checkbox
                    checked={day.enabled}
                    onCheckedChange={checked => updateDay(day.dayOfWeek, { enabled: checked === true })}
                  />
                  {DAY_LABELS[day.dayOfWeek]}
                </label>
                <Input
                  type="time"
                  value={day.opensTime}
                  disabled={!day.enabled}
                  onChange={e => updateDay(day.dayOfWeek, { opensTime: e.target.value })}
                  className="h-9 w-32"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="time"
                  value={day.closesTime}
                  disabled={!day.enabled}
                  onChange={e => updateDay(day.dayOfWeek, { closesTime: e.target.value })}
                  className="h-9 w-32"
                />
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-destructive-foreground">{error}</p>}
        {saved && <p className="text-sm text-primary">Configuración guardada.</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} className="h-11 px-6">
            {submitting ? 'Guardando…' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </MotionConfig>
  )
}
