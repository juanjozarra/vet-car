'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'
import { CAR_MAKES, YEARS, PLATE_STATES } from '@/lib/vehicleOptions'
import { cn } from '@/lib/utils'

export type WorkshopVehicleOption = {
  id: string
  label: string
  plate: string | null
  vin: string | null
}

type Tab = 'existing' | 'new'

type VehicleValues = {
  make: string
  model: string
  year: string
  plate: string
  plateState: string
  vin: string
  mileage: string
  nickname: string
}

const EMPTY_VEHICLE: VehicleValues = {
  make: '', model: '', year: '', plate: '', plateState: '', vin: '', mileage: '', nickname: '',
}

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

function matchesQuery(vehicle: WorkshopVehicleOption, query: string) {
  const haystack = [vehicle.label, vehicle.plate, vehicle.vin]
  return haystack.some(value => value?.toLowerCase().includes(query))
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-full px-4 py-2 font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/40',
        active
          ? 'bg-white/[0.08] text-foreground ring-1 ring-white/[0.1]'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function ReceiveVehicleDialog({ vehicles }: { vehicles: WorkshopVehicleOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('existing')
  const [query, setQuery] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [vehicle, setVehicle] = useState<VehicleValues>(EMPTY_VEHICLE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredVehicles = normalizedQuery
    ? vehicles.filter(v => matchesQuery(v, normalizedQuery))
    : vehicles

  function reset() {
    setTab('existing')
    setQuery('')
    setSelectedVehicleId(null)
    setTitle('')
    setDescription('')
    setVehicle(EMPTY_VEHICLE)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  function handleVehicleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setVehicle(prev => ({ ...prev, [name]: value }))
  }

  function setVehicleField(name: keyof VehicleValues) {
    return (value: string) => setVehicle(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (tab === 'existing' && !selectedVehicleId) {
      setError('Elegí un vehículo de la lista')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(tab === 'existing' ? { vehicleId: selectedVehicleId } : { vehicle }),
          title,
          description: description || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudo recibir el vehículo')
        return
      }
      handleOpenChange(false)
      router.refresh()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">Recibir vehículo</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Recibir vehículo</DialogTitle>
          <DialogDescription>
            Abrí una orden de trabajo sin turno previo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <TabButton active={tab === 'existing'} onClick={() => setTab('existing')}>
            Ya registrado
          </TabButton>
          <TabButton active={tab === 'new'} onClick={() => setTab('new')}>
            Vehículo nuevo
          </TabButton>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormErrorBanner error={error} />

          {tab === 'existing' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="receive-search" className={fieldLabel}>Buscar vehículo</Label>
                <Input
                  id="receive-search"
                  type="search"
                  placeholder="Patente, VIN o nombre"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {filteredVehicles.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.id)}
                    aria-pressed={selectedVehicleId === v.id}
                    className={cn(
                      'flex flex-col items-start gap-0.5 rounded-[1rem] px-4 py-3 text-left outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/40',
                      selectedVehicleId === v.id
                        ? 'bg-primary/[0.08] ring-1 ring-primary/30'
                        : 'bg-white/[0.02] ring-1 ring-white/[0.06] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{v.label}</span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {v.plate ?? 'Sin patente'}
                      {v.vin ? ` · ${v.vin}` : ''}
                    </span>
                  </button>
                ))}
                {filteredVehicles.length === 0 && (
                  <p className="px-1 py-3 text-xs text-muted-foreground">
                    Tu taller todavía no atendió un vehículo que coincida. Cargalo en
                    &ldquo;Vehículo nuevo&rdquo;.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-make" className={fieldLabel}>Marca</Label>
                  <Select value={vehicle.make} onValueChange={setVehicleField('make')} required>
                    <SelectTrigger id="receive-make" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAR_MAKES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-model" className={fieldLabel}>Modelo</Label>
                  <Input
                    id="receive-model" name="model" placeholder="p. ej. CR-V"
                    value={vehicle.model} onChange={handleVehicleChange} required
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-year" className={fieldLabel}>Año</Label>
                  <Select value={vehicle.year} onValueChange={setVehicleField('year')} required>
                    <SelectTrigger id="receive-year" className="w-full">
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
                  <Label htmlFor="receive-plate" className={fieldLabel}>Patente</Label>
                  <Input
                    id="receive-plate" name="plate" placeholder="ABC-1234"
                    value={vehicle.plate} onChange={handleVehicleChange}
                    className="font-mono uppercase placeholder:normal-case"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-plateState" className={fieldLabel}>Provincia / Estado</Label>
                  <Select value={vehicle.plateState} onValueChange={setVehicleField('plateState')}>
                    <SelectTrigger id="receive-plateState" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATE_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="receive-vin" className={fieldLabel}>VIN</Label>
                <Input
                  id="receive-vin" name="vin" placeholder="VIN de 17 caracteres"
                  value={vehicle.vin} onChange={handleVehicleChange}
                  className="font-mono uppercase placeholder:normal-case placeholder:font-sans"
                />
                <p className="text-xs text-muted-foreground">
                  Cargá el VIN para que el dueño pueda reclamar el vehículo y ver su historial.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-mileage" className={fieldLabel}>Kilometraje</Label>
                  <Input
                    id="receive-mileage" name="mileage" type="number" min="0" placeholder="0"
                    value={vehicle.mileage} onChange={handleVehicleChange} className="font-mono"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="receive-nickname" className={fieldLabel}>Apodo</Label>
                  <Input
                    id="receive-nickname" name="nickname" placeholder="p. ej. La camioneta"
                    value={vehicle.nickname} onChange={handleVehicleChange}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-white/[0.06]" />

          <div className="flex flex-col gap-2.5">
            <Label htmlFor="receive-title" className={fieldLabel}>Título de la orden</Label>
            <Input
              id="receive-title" placeholder="p. ej. Cambio de frenos"
              value={title} onChange={e => setTitle(e.target.value)} required
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="receive-description" className={fieldLabel}>Descripción</Label>
            <Textarea
              id="receive-description" placeholder="Qué reportó el cliente"
              value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recibiendo…' : 'Recibir vehículo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
