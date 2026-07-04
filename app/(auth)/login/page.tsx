// app/(auth)/login/page.tsx
'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const MotionButton = motion.create(Button)

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Email o contraseña incorrectos')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="relative w-full max-w-[448px] p-10 flex flex-col gap-8 overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]"
        >
          <div className="absolute -top-32 -left-32 size-64 rounded-full bg-primary opacity-[0.08] blur-[80px] pointer-events-none" />

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="flex items-center gap-3">
              <CarIcon color="#55d8e1" />
              <span className="text-[1.75rem] font-bold tracking-[-0.03em] text-foreground font-mono">VetCar</span>
            </div>
            <p className="text-sm text-muted-foreground">Iniciá sesión para gestionar tus operaciones</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 z-10">
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className="text-sm text-center text-destructive-foreground bg-destructive/30 border border-destructive rounded-md px-3 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">
                Correo electrónico
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <MailIcon />
                </span>
                <Input id="email" name="email" type="email" required autoComplete="email"
                  placeholder="usuario@ejemplo.com" className="h-11 pl-10" />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-foreground font-mono">
                  Contraseña
                </Label>
                <span className="text-[0.6875rem] font-medium text-primary cursor-pointer transition-opacity hover:opacity-80">
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password" placeholder="••••••••"
                  className="h-11 pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" name="remember"
                className="w-4 h-4 rounded accent-[#55d8e1]" />
              <span className="text-sm text-muted-foreground">Recordarme por 30 días</span>
            </label>

            {/* Submit */}
            <MotionButton type="submit" disabled={loading}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="w-full h-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              {!loading && <ArrowRightIcon />}
            </MotionButton>
          </form>

          {/* Footer */}
          <p className="text-sm text-center text-muted-foreground z-10">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="font-medium text-primary transition-opacity hover:opacity-80">Registrate</Link>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
