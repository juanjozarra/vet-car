'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  MapPinIcon, ServiceIcon, ChevronDownIcon, FilterIcon, SearchIcon, CloseIcon,
} from '@/components/ui/icons'
import styles from './ScheduleView.module.scss'

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
      className={`${styles.shopCard} flex flex-col gap-2`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={styles.shopName}>{workshop.name}</span>
          <span className={styles.shopAddress}>{workshop.address}</span>
          {/* ponytail: rating badge omitted — Workshop has no rating field yet */}
          <span className={styles.shopPhone}>Tel: {workshop.phone}</span>
        </div>
      </div>
      {/* ponytail: service-type tag chips omitted — no service catalog data on Workshop yet */}
      <div className={`${styles.cardFooter} flex items-center justify-end pt-2`}>
        <motion.button
          onClick={onBook}
          whileHover={{ scale: 1.03, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
          whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
          className={styles.bookBtn}
        >
          Agendar
        </motion.button>
      </div>
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

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: motionTokens.duration.fast }}
      onClick={onClose}
      className={`${styles.modalOverlay} fixed inset-0 z-50 flex items-center justify-center p-4`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
        onClick={e => e.stopPropagation()}
        className={`${styles.modalCard} w-full max-w-[420px] p-6 flex flex-col gap-4`}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className={styles.modalTitle}>Agendar turno</h2>
            <span className={styles.modalSub}>{workshop.name}</span>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className={styles.closeBtn}>
            <CloseIcon />
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="flex flex-col gap-3 items-start py-2">
            <span className={styles.emptyText}>Todavía no tenés vehículos registrados. Registrá uno para poder agendar un turno.</span>
            <Link href="/owner/vehicles/new" className={styles.registerLink}>
              Registrar vehículo
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vehicleId" className={styles.fieldLabel}>Vehículo</label>
              <select id="vehicleId" value={vehicleId} onChange={e => setVehicleId(e.target.value)}
                required className={styles.select}>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scheduledAt" className={styles.fieldLabel}>Fecha y hora</label>
              <input id="scheduledAt" type="datetime-local" value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)} required className={styles.input} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className={styles.fieldLabel}>Tipo de servicio / notas (opcional)</label>
              <input id="notes" type="text" placeholder="p. ej. Cambio de aceite"
                value={notes} onChange={e => setNotes(e.target.value)} className={styles.input} />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancelar</button>
              <motion.button type="submit" disabled={submitting}
                whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                className={styles.submitBtn}>
                {submitting ? 'Agendando…' : 'Confirmar turno'}
              </motion.button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}

export function ScheduleView({ workshops, vehicles }: ScheduleViewProps) {
  const [activeWorkshop, setActiveWorkshop] = useState<Workshop | null>(null)

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16 flex flex-col overflow-hidden">

        {/* Search & Filter Bar — ponytail: inputs/buttons are visual placeholders, wiring real search/filtering is out of scope for now */}
        <div className={`${styles.searchBar} flex items-center justify-between gap-4 py-4 px-8`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <MapPinIcon />
              </span>
              <input
                type="text"
                placeholder="Ubicación (p. ej. Palermo, CABA)"
                className={styles.locationInput}
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <ServiceIcon />
              </span>
              <select defaultValue="" className={styles.serviceSelect}>
                <option value="" disabled>Tipo de servicio</option>
                <option value="repair">Reparación</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="upgrade">Mejora</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button className={styles.filtersBtn}>
              <FilterIcon />
              Más filtros
            </button>
            <button className={styles.searchBtn}>
              <SearchIcon />
              Buscar
            </button>
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="flex flex-1 overflow-hidden">
          <div className={`${styles.listPanel} flex flex-col gap-6 p-8 overflow-y-auto`}>
            <div className="flex items-center justify-between">
              <h1 className={styles.listHeading}>Talleres disponibles</h1>
              <span className={styles.resultCount}>{workshops.length} resultados</span>
            </div>

            {workshops.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyText}>Todavía no hay talleres registrados en la plataforma.</span>
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
          <div className={`${styles.mapPanel} relative`}>
            <div className={styles.mapGrid} />
            {MAP_PINS.map((pos, i) => (
              <div key={i} className={styles.mapPinWrap} style={{ top: pos.top, left: pos.left }}>
                <div className={styles.mapPin} />
                <div className={styles.mapPinPointer} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {activeWorkshop && (
          <BookingModal
            workshop={activeWorkshop}
            vehicles={vehicles}
            onClose={() => setActiveWorkshop(null)}
          />
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
