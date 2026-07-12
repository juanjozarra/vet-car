'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { ArrowRightIcon } from '@/components/ui/icons'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

export function WorkshopSetupForm() {
  const { update } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const form = e.currentTarget
      const name = (form.elements.namedItem('name') as HTMLInputElement).value
      const address = (form.elements.namedItem('address') as HTMLInputElement).value
      const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
      const email = (form.elements.namedItem('email') as HTMLInputElement).value

      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone, email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'No se pudo crear el taller')
        return
      }

      await update()
      router.push('/mechanic')
      router.refresh()
    } catch {
      setError('No se pudo crear el taller')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Configuración inicial"
      headline="Poné tu taller en el mapa."
      sub="Estos son los datos que van a ver los dueños de vehículos cuando busquen un taller. Después vas a poder sumar especialidades, horarios y ubicación exacta."
    >
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-7 p-8 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-foreground">
              Tu taller
            </h1>
            <p className="text-sm text-muted-foreground">Contanos lo básico para empezar.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-name" className={labelClass}>Nombre del taller</Label>
              <Input id="ws-name" name="name" type="text" required placeholder="p. ej. Taller García" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-address" className={labelClass}>Dirección</Label>
              <Input id="ws-address" name="address" type="text" required
                placeholder="Av. Corrientes 1234, Ciudad, Prov." />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-phone" className={labelClass}>Teléfono</Label>
              <Input id="ws-phone" name="phone" type="tel" required placeholder="+54 9 11 0000-0000" />
            </div>
            <div className="flex flex-col gap-2.5">
              <Label htmlFor="ws-email" className={labelClass}>Email del taller</Label>
              <Input id="ws-email" name="email" type="email" required placeholder="taller@ejemplo.com" />
            </div>

            <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full">
              {loading ? 'Creando taller…' : 'Crear taller'}
              {!loading && (
                <ButtonIconIsland>
                  <ArrowRightIcon className="size-3.5" />
                </ButtonIconIsland>
              )}
            </Button>
          </form>
        </div>
      </div>
    </AuthShell>
  )
}
