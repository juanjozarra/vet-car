// app/(auth)/register/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MotionButton = motion.create(Button)

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    sessionStorage.setItem('reg_pending', JSON.stringify({ name, email, password }))
    router.push('/select-role')
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[448px] flex flex-col gap-6 z-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center size-12 rounded-lg border border-border bg-muted">
              <CarIcon color="#55d8e1" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-foreground font-mono">Crear cuenta</h1>
              <p className="text-sm text-muted-foreground">Completá tus datos para comenzar</p>
            </div>
          </div>

          {/* Card */}
          <div className="p-8 flex flex-col gap-5 rounded-[1.5rem] border border-border bg-card">
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
                <Label htmlFor="name" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Nombre completo</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></span>
                  <Input id="name" name="name" type="text" required autoComplete="name"
                    placeholder="Juan Pérez" className="h-11 pl-10" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Correo electrónico</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><MailIcon /></span>
                  <Input id="email" name="email" type="email" required autoComplete="email"
                    placeholder="vos@ejemplo.com" className="h-11 pl-10" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Contraseña</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    required minLength={8} autoComplete="new-password"
                    placeholder="Mín. 8 caracteres" className="h-11 pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">Confirmar contraseña</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <Input id="confirm" name="confirm" type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    placeholder="Repetí tu contraseña" className="h-11 pl-10 pr-10" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" required
                  className="mt-0.5 w-4 h-4 rounded accent-[#55d8e1] shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Acepto los{' '}
                  <span className="font-medium text-primary cursor-pointer">Términos del servicio</span>
                  {' '}y la{' '}
                  <span className="font-medium text-primary cursor-pointer">Política de privacidad</span>
                </span>
              </label>

              <MotionButton type="submit"
                whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                className="w-full h-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                Continuar
                <ArrowRightIcon />
              </MotionButton>
            </form>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <Link href="/login" className="font-medium text-primary transition-opacity hover:opacity-80">Iniciá sesión</Link>
          </p>
        </motion.div>

        <p className="absolute bottom-6 text-xs text-muted-foreground/50">
          © 2024 VetCar. Todos los derechos reservados.
        </p>
      </main>
    </MotionConfig>
  )
}
