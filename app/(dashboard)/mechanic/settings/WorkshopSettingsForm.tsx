'use client'

import { useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { CheckIcon } from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TimePicker } from '@/components/ui/time-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WORKSHOP_SPECIALTY_OPTIONS } from '@/lib/workshopSpecialty'
import { PlaceLocationInput, type PlaceLocationValue } from '@/components/shared/PlaceLocationInput'
import { GoogleMapsProvider } from '@/components/shared/GoogleMapsProvider'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'
import { cn } from '@/lib/utils'

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
  initialGooglePlaceId: string | null
  initialHours: { dayOfWeek: number; opensMinute: number; closesMinute: number }[]
}

const sectionTitle =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-primary/80'
const sectionHint = 'text-sm text-muted-foreground'

const enter = (delay: number) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})

export function WorkshopSettingsForm({
  initialSpecialties,
  initialSlotDurationMinutes,
  initialAddress,
  initialLatitude,
  initialLongitude,
  initialGooglePlaceId,
  initialHours,
}: WorkshopSettingsFormProps) {
  const router = useRouter()
  const [specialties, setSpecialties] = useState<string[]>(initialSpecialties)
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes)
  const [location, setLocation] = useState<PlaceLocationValue>({
    address: initialAddress,
    latitude: initialLatitude,
    longitude: initialLongitude,
    googlePlaceId: initialGooglePlaceId,
  })
  const hasLocation = location.latitude !== null && location.longitude !== null
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

  async function handleSubmit(e: SubmitEvent) {
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
          latitude: location.latitude,
          longitude: location.longitude,
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
      <div className="mx-auto w-full max-w-[760px]">
        <motion.div {...enter(0)} className="mb-10 flex flex-col items-start gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Configuración
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Tu taller, a punto.
          </h1>
          <p className="max-w-lg text-base text-muted-foreground">
            Especialidades, ubicación y horarios: lo que define cómo te encuentran y cuándo pueden reservarte.
          </p>
        </motion.div>

        <motion.form {...enter(0.12)} onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-10 p-7 sm:p-9">

              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className={sectionTitle}>01 — Especialidades</h2>
                  <p className={sectionHint}>Los dueños filtran talleres por estas categorías.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {WORKSHOP_SPECIALTY_OPTIONS.map(opt => {
                    const checked = specialties.includes(opt.value)
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm ring-1 transition-[background-color,box-shadow,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] select-none',
                          checked
                            ? 'bg-primary/[0.08] text-foreground ring-primary/30'
                            : 'bg-white/[0.02] text-muted-foreground ring-white/[0.08] hover:bg-white/[0.04] hover:text-foreground'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSpecialty(opt.value)}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className={sectionTitle}>02 — Ubicación</h2>
                  <p className={sectionHint}>Así aparecés en el mapa y en las búsquedas por cercanía.</p>
                </div>
                <GoogleMapsProvider>
                  <PlaceLocationInput
                    initialAddress={initialAddress}
                    initialLatitude={initialLatitude}
                    initialLongitude={initialLongitude}
                    onSelect={setLocation}
                  />
                </GoogleMapsProvider>
                {!hasLocation && (
                  <p className="rounded-xl bg-primary/[0.06] px-4 py-3 text-xs leading-relaxed text-primary/90 ring-1 ring-primary/20">
                    Todavía no configuraste la ubicación del taller: no vas a aparecer en el mapa de búsqueda hasta que lo hagas.
                  </p>
                )}
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className={sectionTitle}>03 — Duración del turno</h2>
                  <p className={sectionHint}>Cada reserva ocupa un bloque de este tamaño.</p>
                </div>
                <Select value={String(slotDurationMinutes)} onValueChange={v => setSlotDurationMinutes(Number(v))}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_DURATIONS.map(d => (
                      <SelectItem key={d} value={String(d)}>{d} minutos</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className={sectionTitle}>04 — Horario de atención</h2>
                  <p className={sectionHint}>Los turnos disponibles se generan dentro de estas franjas.</p>
                </div>
                <div className="flex flex-col gap-2">
                  {days.map(day => (
                    <div
                      key={day.dayOfWeek}
                      className={cn(
                        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3 ring-1 transition-[background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                        day.enabled
                          ? 'bg-white/[0.03] ring-white/[0.08]'
                          : 'bg-transparent ring-white/[0.05]'
                      )}
                    >
                      <label className="flex w-32 shrink-0 cursor-pointer items-center gap-3 text-sm text-foreground select-none">
                        <Checkbox
                          checked={day.enabled}
                          onCheckedChange={checked => updateDay(day.dayOfWeek, { enabled: checked === true })}
                        />
                        <span className={cn(!day.enabled && 'text-muted-foreground')}>
                          {DAY_LABELS[day.dayOfWeek]}
                        </span>
                      </label>
                      {day.enabled ? (
                        <div className="flex items-center gap-3">
                          <TimePicker
                            value={day.opensTime}
                            onChange={time => updateDay(day.dayOfWeek, { opensTime: time })}
                          />
                          <span className="text-sm text-muted-foreground">a</span>
                          <TimePicker
                            value={day.closesTime}
                            onChange={time => updateDay(day.dayOfWeek, { closesTime: time })}
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground/50">
                          Cerrado
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <FormErrorBanner error={error} />
              <AnimatePresence mode="wait">
                {saved && !error && (
                  <motion.p
                    key="saved"
                    role="status"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                    className="flex items-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm text-ok ring-1 ring-ok/25"
                  >
                    <CheckIcon className="size-4" />
                    Configuración guardada.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex justify-end border-t border-white/[0.06] pt-6">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar configuración'}
                  {!submitting && (
                    <ButtonIconIsland>
                      <CheckIcon className="size-3.5" />
                    </ButtonIconIsland>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </motion.form>
      </div>
    </MotionConfig>
  )
}
