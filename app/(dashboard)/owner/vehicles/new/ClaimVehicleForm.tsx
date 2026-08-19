'use client'

import { useState, type SubmitEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'

const fieldLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'
const sectionTitle =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-primary/80'

export function ClaimVehicleForm() {
  const router = useRouter()
  const [vin, setVin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/vehicles/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudo reclamar el vehículo')
        return
      }
      router.push(`/owner/vehicles/${data.id}`)
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
        transition={{ duration: 0.6, ease: motionTokens.easing.fluid, delay: 0.1 }}
        className="mx-auto mt-8 w-full max-w-[640px]"
      >
        <form onSubmit={handleSubmit}>
          <div className="bezel">
            <div className="bezel-core flex flex-col gap-5 p-7 sm:p-9">
              <h2 className={sectionTitle}>¿Un taller ya cargó tu vehículo?</h2>
              <p className="text-sm text-muted-foreground">
                Si un taller te atendió sin turno previo, ya tiene tu vehículo cargado con
                su historial. Ingresá el VIN —está en la cédula del vehículo y en el
                tablero, del lado del conductor— para reclamarlo.
              </p>
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="claim-vin" className={fieldLabel}>VIN</Label>
                <Input
                  id="claim-vin"
                  name="vin"
                  type="text"
                  placeholder="VIN de 17 caracteres"
                  value={vin}
                  onChange={e => setVin(e.target.value)}
                  required
                  className="font-mono uppercase placeholder:normal-case placeholder:font-sans"
                />
              </div>

              <FormErrorBanner error={error} />

              <div className="flex items-center justify-end border-t border-white/[0.06] pt-6">
                <Button type="submit" variant="secondary" disabled={submitting}>
                  {submitting ? 'Reclamando…' : 'Reclamar'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </MotionConfig>
  )
}
