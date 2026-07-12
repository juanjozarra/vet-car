// app/(auth)/login/page.tsx
'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { AuthShell } from '@/components/shared/AuthShell'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'

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
    <AuthShell
      eyebrow="Plataforma de servicio vehicular"
      headline="La bitácora completa de tu vehículo."
      sub="Historial de reparaciones, mantenimiento y turnos — compartido entre dueños y talleres, siempre al día."
    >
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-7 p-8 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-foreground">
              Iniciá sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Entrá para gestionar tus vehículos y turnos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate={false}>
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
              <Label htmlFor="email" className={labelClass}>
                Correo electrónico
              </Label>
              <div className="group relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
                  <MailIcon />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="usuario@ejemplo.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="password" className={labelClass}>
                Contraseña
              </Label>
              <div className="group relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary">
                  <LockIcon />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full">
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              {!loading && (
                <ButtonIconIsland>
                  <ArrowRightIcon className="size-3.5" />
                </ButtonIconIsland>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{' '}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
