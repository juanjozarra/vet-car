'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  UploadIcon, OdometerIcon, ScanIcon, PlusIcon,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MotionButton = motion.create(Button)

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

const fieldLabel = 'text-sm font-medium text-muted-foreground'
const sectionLabel = 'text-xs font-medium text-muted-foreground tracking-[0.05em] uppercase font-mono'

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
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-[2.25rem] font-bold text-foreground tracking-[-0.02em] font-mono">Registrar nuevo vehículo</h1>
        <p className="text-base text-muted-foreground">Agregá un vehículo para registrar su historial de servicio.</p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-lg border border-border bg-card overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-primary opacity-50" />
            <div className="p-8 flex flex-col gap-8">

              <section className="flex flex-col gap-4">
                <div className="border-b border-border pb-2">
                  <h2 className={sectionLabel}>Identificación</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nickname" className={fieldLabel}>Apodo del vehículo</Label>
                  <Input id="nickname" name="nickname" type="text" placeholder="p. ej. Mi Honda"
                    value={values.nickname} onChange={handleChange} className="h-11" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vin" className={fieldLabel}>VIN</Label>
                  <div className="flex gap-2">
                    <Input id="vin" name="vin" type="text" placeholder="VIN de 17 caracteres"
                      value={values.vin} onChange={handleChange} className="h-11" />
                    <Button type="button" variant="outline" disabled
                      aria-label="Escanear código de barras VIN (próximamente)"
                      className="h-11 shrink-0 font-mono text-xs tracking-[0.05em] cursor-not-allowed">
                      <ScanIcon />Escanear
                    </Button>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="border-b border-border pb-2">
                  <h2 className={sectionLabel}>Detalles</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="make" className={fieldLabel}>Marca</Label>
                    <Select value={values.make} onValueChange={setField('make')} required>
                      <SelectTrigger id="make" className="h-11 w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CAR_MAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="model" className={fieldLabel}>Modelo</Label>
                    <Input id="model" name="model" type="text" placeholder="p. ej. CR-V"
                      value={values.model} onChange={handleChange} required className="h-11" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="year" className={fieldLabel}>Año</Label>
                    <Select value={values.year} onValueChange={setField('year')} required>
                      <SelectTrigger id="year" className="h-11 w-full">
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="plate" className={fieldLabel}>Patente</Label>
                    <Input id="plate" name="plate" type="text" placeholder="ABC-1234"
                      value={values.plate} onChange={handleChange} className="h-11" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="plateState" className={fieldLabel}>Provincia / Estado</Label>
                    <Select value={values.plateState} onValueChange={setField('plateState')}>
                      <SelectTrigger id="plateState" className="h-11 w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="mileage" className={fieldLabel}>Kilometraje actual</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <OdometerIcon />
                    </span>
                    <Input id="mileage" name="mileage" type="number" min="0" placeholder="0"
                      value={values.mileage} onChange={handleChange}
                      className="h-11 pl-10 pr-12" />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">km</span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className="border-b border-border pb-2">
                  <h2 className={sectionLabel}>Fotos</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={fieldLabel}>Foto del vehículo</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 h-36 rounded-lg border border-dashed border-border overflow-hidden transition-colors cursor-pointer hover:border-[#869394]">
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium text-primary">Clic para subir</span>
                          <span className="text-xs text-muted-foreground">PNG, JPG o WEBP, máx. 5 MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              {error && <p className="text-sm text-destructive-foreground">{error}</p>}

              <div className="border-t border-border flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => router.push('/owner')} className="px-4 py-2 text-sm">
                  Cancelar
                </Button>
                <MotionButton type="submit" disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className="h-10 px-4 text-xs tracking-[0.037em]">
                  <PlusIcon color="#003739" />
                  {submitting ? 'Registrando…' : 'Registrar vehículo'}
                </MotionButton>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
