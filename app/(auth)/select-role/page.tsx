// app/(auth)/select-role/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MotionButton = motion.create(Button)

type Role = 'MECHANIC' | 'OWNER'

export default function SelectRolePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!selected) return

    const raw = sessionStorage.getItem('reg_pending')
    if (!raw) {
      router.replace('/register')
      return
    }

    setError('')
    setLoading(true)

    const { name, email, password } = JSON.parse(raw) as { name: string; email: string; password: string }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: selected }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'El registro falló')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('reg_pending')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Cuenta creada, pero el inicio de sesión falló. Por favor, iniciá sesión manualmente.')
      router.push('/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[600px] flex flex-col items-center gap-8 z-10"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-[2rem] font-bold tracking-[-0.02em] text-foreground font-mono">¡Bienvenido/a a VetCar!</h1>
            <p className="text-base text-muted-foreground">Seleccioná tu rol para completar el registro.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p key="error"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                className="w-full text-sm text-center text-destructive-foreground bg-destructive/30 border border-destructive rounded-md px-3 py-2">
                {error}{' '}
                {error.includes('Email already in use') && (
                  <a href="/register" className="underline text-primary">Volver para editar</a>
                )}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button type="button" onClick={() => setSelected('MECHANIC')}
              whileHover={{ scale: selected === 'MECHANIC' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={cn(
                'flex flex-col gap-4 rounded-[1.5rem] border border-border bg-card p-8 text-left cursor-pointer transition-colors hover:border-[#869394]',
                selected === 'MECHANIC' && 'border-primary bg-popover ring-1 ring-primary'
              )}>
              <div className="flex items-center justify-center size-12 rounded-full bg-muted"><WrenchIcon /></div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-foreground font-mono">Mecánico / Dueño de taller</span>
                <span className="text-sm text-muted-foreground">Administrá clientes, vehículos, órdenes de trabajo y registros de servicio.</span>
              </div>
              {selected === 'MECHANIC' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary font-mono">
                  <div className="size-1.5 rounded-full bg-primary" />
                  Seleccionado
                </div>
              )}
            </motion.button>

            <motion.button type="button" onClick={() => setSelected('OWNER')}
              whileHover={{ scale: selected === 'OWNER' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={cn(
                'flex flex-col gap-4 rounded-[1.5rem] border border-border bg-card p-8 text-left cursor-pointer transition-colors hover:border-[#869394]',
                selected === 'OWNER' && 'border-primary bg-popover ring-1 ring-primary'
              )}>
              <div className="flex items-center justify-center size-12 rounded-full bg-muted"><CarIcon color="#55d8e1" /></div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold text-foreground font-mono">Propietario de vehículo</span>
                <span className="text-sm text-muted-foreground">Consultá el historial de tu vehículo, seguí los registros de servicio y aprobá presupuestos.</span>
              </div>
              {selected === 'OWNER' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary font-mono">
                  <div className="size-1.5 rounded-full bg-primary" />
                  Seleccionado
                </div>
              )}
            </motion.button>
          </div>

          <MotionButton type="button" onClick={handleContinue}
            disabled={!selected || loading}
            whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className="w-full h-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {loading ? 'Creando cuenta…' : 'Completar registro'}
            {!loading && <ArrowRightIcon />}
          </MotionButton>

          <p className="text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <a href="/login" className="font-medium text-primary transition-opacity hover:opacity-80">Iniciá sesión</a>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
