'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { WrenchIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MotionButton = motion.create(Button)

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
    <MotionConfig reducedMotion="user">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[448px] flex flex-col gap-6 z-10"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-lg border border-border bg-muted"><WrenchIcon /></div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-foreground font-mono">Configurá tu taller</h1>
            <p className="text-sm text-muted-foreground">Contanos sobre tu taller para comenzar.</p>
          </div>
        </div>

        <div className="relative rounded-[1.5rem] border border-border bg-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-primary opacity-50" />
          <div className="p-8 flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.p key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className="text-sm text-center text-destructive-foreground bg-destructive/30 border border-destructive rounded-md px-3 py-2">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-name" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Nombre del taller</Label>
                <Input id="ws-name" name="name" type="text" required
                  placeholder="p. ej. Taller García" className="h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-address" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Dirección</Label>
                <Input id="ws-address" name="address" type="text" required
                  placeholder="Av. Corrientes 1234, Ciudad, Prov." className="h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-phone" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Teléfono</Label>
                <Input id="ws-phone" name="phone" type="tel" required
                  placeholder="+54 9 11 0000-0000" className="h-11" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ws-email" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Email del taller</Label>
                <Input id="ws-email" name="email" type="email" required
                  placeholder="taller@ejemplo.com" className="h-11" />
              </div>
              <MotionButton type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                className="w-full h-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                {loading ? 'Creando taller…' : 'Crear taller'}
              </MotionButton>
            </form>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
