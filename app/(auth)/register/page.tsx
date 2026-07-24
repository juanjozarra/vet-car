// app/(auth)/register/page.tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { AuthShell } from '@/components/shared/AuthShell'
import { FormErrorBanner } from '@/components/shared/FormErrorBanner'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const labelClass =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground'
const iconClass =
  'pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground/60 transition-colors duration-300 group-focus-within:text-primary'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') ?? ''
  const lockedRole = searchParams.get('role') === 'MECHANIC' ? 'MECHANIC' : null
  const callbackUrl = searchParams.get('callbackUrl')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

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
    if (!acceptedTerms) {
      setError('Tenés que aceptar los términos para continuar')
      return
    }

    sessionStorage.setItem('reg_pending', JSON.stringify({ name, email, password, lockedRole, callbackUrl }))
    router.push('/select-role')
  }

  return (
    <AuthShell
      eyebrow="Creá tu cuenta"
      headline="Empezá tu registro de servicio."
      sub="En menos de un minuto tenés tu cuenta lista — para registrar tu vehículo o poner tu taller en el mapa."
    >
      <div className="bezel">
        <div className="bezel-core flex flex-col gap-7 p-8 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[1.75rem] font-medium tracking-[-0.02em] text-foreground">
              Crear cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              {lockedRole ? 'Paso 1 de 2 — tus datos para unirte al taller.' : 'Paso 1 de 2 — tus datos.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FormErrorBanner error={error} />

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="name" className={labelClass}>
                Nombre completo
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <UserIcon />
                </span>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Juan Pérez"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="email" className={labelClass}>
                Correo electrónico
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <MailIcon />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="vos@ejemplo.com"
                  defaultValue={prefillEmail}
                  readOnly={lockedRole !== null}
                  className="pl-10"
                />
              </div>
              {lockedRole && (
                <span className="text-xs text-muted-foreground">Este correo viene de tu invitación.</span>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="password" className={labelClass}>
                Contraseña
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <LockIcon />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres"
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

            <div className="flex flex-col gap-2.5">
              <Label htmlFor="confirm" className={labelClass}>
                Confirmar contraseña
              </Label>
              <div className="group relative">
                <span className={iconClass}>
                  <LockIcon />
                </span>
                <Input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repetí tu contraseña"
                  className="pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 select-none">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={checked => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed text-muted-foreground">
                Acepto los términos del servicio y la política de privacidad de VetCar.
              </span>
            </label>

            <Button type="submit" size="lg" className="mt-1 w-full">
              Continuar
              <ButtonIconIsland>
                <ArrowRightIcon className="size-3.5" />
              </ButtonIconIsland>
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
