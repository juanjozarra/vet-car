'use client'

import { useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { UploadIcon, PlusIcon } from '@/components/ui/icons'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SERVICE_ITEM_TYPE_OPTIONS } from '@/lib/serviceItemType'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'
import type { ServiceItemType } from '@prisma/client'

interface HistoryEntryFormInitialValues {
  type: ServiceItemType
  description: string
  performedAt: string
  odometerReading: number | null
  cost: number | null
  photoUrl: string | null
}

interface HistoryEntryFormProps {
  vehicleId: string
  backHref: string
  mode: 'create' | 'edit'
  entryId?: string
  initialValues?: HistoryEntryFormInitialValues
}

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

export function HistoryEntryForm({ vehicleId, backHref, mode, entryId, initialValues }: HistoryEntryFormProps) {
  const router = useRouter()
  const [type, setType] = useState<string>(initialValues?.type ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [performedAt, setPerformedAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.performedAt) : null
  )
  const [odometerReading, setOdometerReading] = useState(
    initialValues?.odometerReading != null ? String(initialValues.odometerReading) : ''
  )
  const [cost, setCost] = useState(initialValues?.cost != null ? String(initialValues.cost) : '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialValues?.photoUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/history/upload',
      })
      setPhotoUrl(blob.url)
    } catch {
      setUploadError('No se pudo subir la foto. Podés guardar el registro sin ella.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const url = mode === 'create' ? `/api/vehicles/${vehicleId}/history` : `/api/history/${entryId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          performedAt: performedAt?.toISOString(),
          odometerReading: odometerReading || null,
          cost: cost || null,
          photoUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error')
        return
      }
      router.push(backHref)
      router.refresh()
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
            {mode === 'create' ? 'Nuevo registro' : 'Editar registro'}
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            {mode === 'create' ? 'Sumá al historial.' : 'Actualizá el registro.'}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-8 p-7 sm:p-9">
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="type" className={fieldLabel}>Tipo</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_ITEM_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="description" className={fieldLabel}>Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="p. ej. Cambio de aceite y filtro"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <Label className={fieldLabel}>Fecha realizada</Label>
                  <DatePicker
                    selected={performedAt}
                    onSelect={setPerformedAt}
                    maxMonth={new Date()}
                    isDayDisabled={date => date.getTime() > Date.now()}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label htmlFor="odometerReading" className={fieldLabel}>Kilometraje (opcional)</Label>
                  <Input
                    id="odometerReading"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={odometerReading}
                    onChange={e => setOdometerReading(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <Label htmlFor="cost" className={fieldLabel}>Costo (opcional)</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <span className={fieldLabel}>Foto (opcional)</span>
                <label className="group/upload flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[1rem] border border-dashed border-white/[0.14] bg-white/[0.02] transition-[border-color,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/50 hover:bg-primary/[0.03]">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="Vista previa" className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <UploadIcon className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {uploading ? 'Subiendo…' : 'Clic para subir'}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
                {uploadError && <p className="text-xs text-[#ffb3ae]">{uploadError}</p>}
              </div>

              <FormErrorBanner error={error} />

              <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] pt-6">
                <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting || !type || !performedAt}>
                  {submitting ? 'Guardando…' : 'Guardar registro'}
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
