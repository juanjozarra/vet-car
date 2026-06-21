'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  UploadIcon,
  OdometerIcon,
  ChevronDownIcon,
  ScanIcon,
  PlusIcon,
} from '@/components/ui/icons'

// ── Static data ───────────────────────────────────────────────────────────────

const CAR_MAKES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche',
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other',
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

// ── Types ─────────────────────────────────────────────────────────────────────

type FormValues = {
  nickname: string
  vin: string
  make: string
  model: string
  year: string
  plate: string
  plateState: string
  mileage: string
}

// ── Shared input/label styles ─────────────────────────────────────────────────

const inputCls =
  'bg-[#060e20] border border-[#434655] rounded px-4 py-3 text-sm text-[#dae2fd] placeholder-[#8d90a0] focus:border-[#2563eb] focus:outline-none w-full'

const labelCls = 'text-sm font-medium text-[#c3c6d7]'

// ── Component ─────────────────────────────────────────────────────────────────

export function NewVehicleForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({
    nickname: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    plate: '',
    plateState: '',
    mileage: '',
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
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push('/owner')
    } catch {
      setError('Network error. Please try again.')
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
      {/* Page title */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-4xl font-bold text-[#dae2fd] tracking-tight">Register New Vehicle</h1>
        <p className="text-base text-[#c3c6d7]">Add a vehicle to track its service history.</p>
      </div>

      {/* Form card — 600px centered */}
      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative bg-[#0b1326] border border-[#434655] rounded-lg overflow-hidden">
            {/* Subtle top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-[#2563eb] opacity-40" />

            <div className="p-8 flex flex-col gap-8">

              {/* ── Identification ─────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Identification</h2>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nickname" className={labelCls}>Vehicle Nickname</label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    placeholder="e.g. My Honda"
                    value={values.nickname}
                    onChange={handleChange}
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vin" className={labelCls}>VIN</label>
                  <div className="flex gap-2">
                    <input
                      id="vin"
                      name="vin"
                      type="text"
                      placeholder="17-character VIN"
                      value={values.vin}
                      onChange={handleChange}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      disabled
                      aria-label="Scan VIN barcode (coming soon)"
                      className="shrink-0 flex items-center gap-2 px-4 py-3 bg-[#131b2e] border border-[#434655] rounded text-xs font-medium text-[#8d90a0] tracking-[0.05em] cursor-not-allowed"
                    >
                      <ScanIcon />
                      Scan
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Details ────────────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Details</h2>
                </div>

                {/* Make / Model / Year */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="make" className={labelCls}>Make</label>
                    <div className="relative">
                      <select
                        id="make"
                        name="make"
                        value={values.make}
                        onChange={handleChange}
                        required
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="" disabled>Select</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="model" className={labelCls}>Model</label>
                    <input
                      id="model"
                      name="model"
                      type="text"
                      placeholder="e.g. CR-V"
                      value={values.model}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className={labelCls}>Year</label>
                    <div className="relative">
                      <select
                        id="year"
                        name="year"
                        value={values.year}
                        onChange={handleChange}
                        required
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="" disabled>Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plate / State */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plate" className={labelCls}>License Plate</label>
                    <input
                      id="plate"
                      name="plate"
                      type="text"
                      placeholder="ABC-1234"
                      value={values.plate}
                      onChange={handleChange}
                      className={inputCls}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plateState" className={labelCls}>State / Province</label>
                    <div className="relative">
                      <select
                        id="plateState"
                        name="plateState"
                        value={values.plateState}
                        onChange={handleChange}
                        className="w-full appearance-none bg-[#060e20] border border-[#434655] rounded px-4 py-3 pr-8 text-sm text-[#dae2fd] focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="">Select</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mileage */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mileage" className={labelCls}>Current Mileage</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <OdometerIcon />
                    </span>
                    <input
                      id="mileage"
                      name="mileage"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={values.mileage}
                      onChange={handleChange}
                      className="w-full bg-[#060e20] border border-[#434655] rounded pl-10 pr-12 py-3 text-sm text-[#dae2fd] placeholder-[#8d90a0] focus:border-[#2563eb] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8d90a0]">
                      km
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Media ──────────────────────────────────────────────────── */}
              <section className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#434655]">
                  <h2 className="text-xs font-medium text-[#c3c6d7] tracking-[0.05em] uppercase">Media</h2>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Vehicle Photo</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center gap-3 h-36 border border-dashed border-[#434655] rounded hover:border-[#8d90a0] transition-colors overflow-hidden"
                  >
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium text-[#b4c5ff]">Click to upload</span>
                          <span className="text-xs text-[#8d90a0]">PNG, JPG or WEBP, max 5MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </div>
              </section>

              {/* ── Error ──────────────────────────────────────────────────── */}
              {error && (
                <p className="text-sm text-[#ffb4ab]">{error}</p>
              )}

              {/* ── Actions ────────────────────────────────────────────────── */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#434655]">
                <button
                  type="button"
                  onClick={() => router.push('/owner')}
                  className="px-4 py-2 text-sm font-medium text-[#c3c6d7] hover:text-[#dae2fd] transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={
                    !submitting
                      ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }
                      : undefined
                  }
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className="flex items-center gap-2 h-10 px-4 rounded bg-[#2563eb] text-[#002a78] text-xs font-medium tracking-[0.6px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <PlusIcon color="#002a78" />
                  {submitting ? 'Registering…' : 'Register Vehicle'}
                </motion.button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
