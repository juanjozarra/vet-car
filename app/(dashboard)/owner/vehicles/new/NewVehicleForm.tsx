'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  UploadIcon, OdometerIcon, ChevronDownIcon, ScanIcon, PlusIcon,
} from '@/components/ui/icons'
import styles from './NewVehicleForm.module.scss'

const CAR_MAKES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche',
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Otro',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i)

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK',
]

type FormValues = {
  nickname: string; vin: string; make: string; model: string
  year: string; plate: string; plateState: string; mileage: string
}

export function NewVehicleForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({
    nickname: '', vin: '', make: '', model: '', year: '', plate: '', plateState: '', mileage: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      router.push('/owner')
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      <div className="mb-8 flex flex-col gap-1">
        <h1 className={styles.pageTitle}>Registrar nuevo vehículo</h1>
        <p className={styles.pageSub}>Agregá un vehículo para registrar su historial de servicio.</p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`${styles.formCard} relative`}>
            <div className={styles.topAccent} />
            <div className="p-8 flex flex-col gap-8">

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Identificación</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nickname" className={styles.fieldLabel}>Apodo del vehículo</label>
                  <input id="nickname" name="nickname" type="text" placeholder="p. ej. Mi Honda"
                    value={values.nickname} onChange={handleChange} className={styles.input} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vin" className={styles.fieldLabel}>VIN</label>
                  <div className="flex gap-2">
                    <input id="vin" name="vin" type="text" placeholder="VIN de 17 caracteres"
                      value={values.vin} onChange={handleChange} className={styles.input} />
                    <button type="button" disabled aria-label="Escanear código de barras VIN (próximamente)"
                      className={styles.scanBtn}>
                      <ScanIcon />Escanear
                    </button>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Detalles</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="make" className={styles.fieldLabel}>Marca</label>
                    <div className="relative">
                      <select id="make" name="make" value={values.make} onChange={handleChange}
                        required className={styles.select}>
                        <option value="" disabled>Seleccionar</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="model" className={styles.fieldLabel}>Modelo</label>
                    <input id="model" name="model" type="text" placeholder="p. ej. CR-V"
                      value={values.model} onChange={handleChange} required className={styles.input} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className={styles.fieldLabel}>Año</label>
                    <div className="relative">
                      <select id="year" name="year" value={values.year} onChange={handleChange}
                        required className={styles.select}>
                        <option value="" disabled>Año</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plate" className={styles.fieldLabel}>Patente</label>
                    <input id="plate" name="plate" type="text" placeholder="ABC-1234"
                      value={values.plate} onChange={handleChange} className={styles.input} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plateState" className={styles.fieldLabel}>Provincia / Estado</label>
                    <div className="relative">
                      <select id="plateState" name="plateState" value={values.plateState}
                        onChange={handleChange} className={styles.select}>
                        <option value="">Seleccionar</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mileage" className={styles.fieldLabel}>Kilometraje actual</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <OdometerIcon />
                    </span>
                    <input id="mileage" name="mileage" type="number" min="0" placeholder="0"
                      value={values.mileage} onChange={handleChange}
                      className={styles.inputIconLeft} />
                    <span className={`${styles.mileageUnit} absolute right-4 top-1/2 -translate-y-1/2`}>km</span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Fotos</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={styles.fieldLabel}>Foto del vehículo</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className={styles.uploadArea}>
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon />
                        <div className="flex flex-col items-center gap-1">
                          <span className={styles.uploadLabel}>Clic para subir</span>
                          <span className={styles.uploadHint}>PNG, JPG o WEBP, máx. 5 MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={`${styles.actionsDivider} flex items-center justify-end gap-3 pt-2`}>
                <button type="button" onClick={() => router.push('/owner')} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <motion.button type="submit" disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className={styles.submitBtn}>
                  <PlusIcon color="#003739" />
                  {submitting ? 'Registrando…' : 'Registrar vehículo'}
                </motion.button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
