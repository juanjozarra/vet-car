'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { UploadIcon, OdometerIcon, PlusIcon } from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'
const sectionTitle =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-primary/80'

export function NewVehicleForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({
    nickname: '', vin: '', make: '', model: '', year: '', plate: '', plateState: '', mileage: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
  }

  function setField(name: keyof FormValues) {
    return (value: string) => setValues(prev => ({ ...prev, [name]: value }))
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
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: motionTokens.easing.fluid }}
        className="mx-auto w-full max-w-[640px]"
      >
        <div className="mb-10 flex flex-col items-start gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Nuevo vehículo
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Sumalo a la bitácora.
          </h1>
          <p className="text-base text-muted-foreground">
            Registrá tu vehículo para empezar a construir su historial de servicio.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-10 p-7 sm:p-9">

              <section className="flex flex-col gap-5">
                <h2 className={sectionTitle}>01 — Identificación</h2>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="nickname" className={fieldLabel}>Apodo del vehículo</Label>
                  <Input id="nickname" name="nickname" type="text" placeholder="p. ej. Mi Honda"
                    value={values.nickname} onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="vin" className={fieldLabel}>VIN</Label>
                  <Input id="vin" name="vin" type="text" placeholder="VIN de 17 caracteres"
                    value={values.vin} onChange={handleChange} className="font-mono uppercase placeholder:normal-case placeholder:font-sans" />
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-5">
                <h2 className={sectionTitle}>02 — Detalles</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="make" className={fieldLabel}>Marca</Label>
                    <Select value={values.make} onValueChange={setField('make')} required>
                      <SelectTrigger id="make" className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAR_MAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="model" className={fieldLabel}>Modelo</Label>
                    <Input id="model" name="model" type="text" placeholder="p. ej. CR-V"
                      value={values.model} onChange={handleChange} required />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="year" className={fieldLabel}>Año</Label>
                    <Select value={values.year} onValueChange={setField('year')} required>
                      <SelectTrigger id="year" className="w-full">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="plate" className={fieldLabel}>Patente</Label>
                    <Input id="plate" name="plate" type="text" placeholder="ABC-1234"
                      value={values.plate} onChange={handleChange}
                      className="font-mono uppercase placeholder:normal-case" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Label htmlFor="plateState" className={fieldLabel}>Provincia / Estado</Label>
                    <Select value={values.plateState} onValueChange={setField('plateState')}>
                      <SelectTrigger id="plateState" className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="mileage" className={fieldLabel}>Kilometraje actual</Label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
                      <OdometerIcon />
                    </span>
                    <Input id="mileage" name="mileage" type="number" min="0" placeholder="0"
                      value={values.mileage} onChange={handleChange}
                      className="pr-12 pl-10 font-mono" />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground/60">km</span>
                  </div>
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              <section className="flex flex-col gap-5">
                <h2 className={sectionTitle}>03 — Foto</h2>
                <div className="flex flex-col gap-2.5">
                  <span className={fieldLabel}>Foto del vehículo (opcional)</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="group/upload flex h-40 flex-col items-center justify-center gap-3 overflow-hidden rounded-[1rem] border border-dashed border-white/[0.14] bg-white/[0.02] outline-none transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:ring-3 focus-visible:ring-ring/40">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08] transition-colors duration-300 group-hover/upload:text-primary">
                          <UploadIcon />
                        </span>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-medium text-foreground">Clic para subir</span>
                          <span className="text-xs text-muted-foreground">PNG, JPG o WEBP, máx. 5 MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="error"
                    role="alert"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                    className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-6">
                <Button type="button" variant="ghost" onClick={() => router.push('/owner')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Registrando…' : 'Registrar vehículo'}
                  {!submitting && (
                    <ButtonIconIsland>
                      <PlusIcon className="size-3.5" />
                    </ButtonIconIsland>
                  )}
                </Button>
              </div>

            </div>
          </div>
        </form>
      </motion.div>
    </MotionConfig>
  )
}
