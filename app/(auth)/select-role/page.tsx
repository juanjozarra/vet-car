// app/(auth)/select-role/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, CheckIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import { Logo } from '@/components/shared/Logo'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Role = 'MECHANIC' | 'OWNER'

const ROLE_OPTIONS: {
  role: Role
  icon: typeof WrenchIcon
  title: string
  description: string
}[] = [
  {
    role: 'MECHANIC',
    icon: WrenchIcon,
    title: 'Mecánico / Taller',
    description: 'Poné tu taller en el mapa, definí horarios y recibí turnos de tus clientes.',
  },
  {
    role: 'OWNER',
    icon: CarIcon,
    title: 'Dueño de vehículo',
    description: 'Registrá tus vehículos, seguí su historial y agendá turnos en talleres cercanos.',
  },
]

export default function SelectRolePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [lockedRole, setLockedRole] = useState<Role | null>(null)
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('reg_pending')
    if (!raw) return
    const pending = JSON.parse(raw) as { lockedRole?: Role | null; callbackUrl?: string | null }
    if (pending.lockedRole) {
      setLockedRole(pending.lockedRole)
      setSelected(pending.lockedRole)
    }
    if (pending.callbackUrl) setCallbackUrl(pending.callbackUrl)
  }, [])

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

    router.push(callbackUrl ?? '/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: motionTokens.easing.fluid }}
          className="flex w-full max-w-[640px] flex-col items-center gap-10"
        >
          <div className="flex flex-col items-center gap-6 text-center">
            <Logo className="text-xl" />
            <div className="flex flex-col items-center gap-4">
              <span className="eyebrow">
                <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
                Último paso
              </span>
              <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground sm:text-5xl">
                {lockedRole ? 'Vas a unirte como mecánico.' : '¿Cómo vas a usar VetCar?'}
              </h1>
              <p className="max-w-md text-base text-muted-foreground">
                {lockedRole
                  ? 'Tu invitación ya define tu rol — completá el registro para unirte al taller.'
                  : 'Elegí tu rol para completar el registro. Esto define tu panel y tus herramientas.'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                className="w-full rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {!lockedRole && (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Rol">
              {ROLE_OPTIONS.map(({ role, icon: RoleIcon, title, description }, i) => {
                const isSelected = selected === role
                return (
                  <motion.button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelected(role)}
                    initial={{ opacity: 0, y: motionTokens.distance.md }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: motionTokens.easing.fluid, delay: 0.15 + i * 0.08 }}
                    whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                    className={cn(
                      'bezel cursor-pointer text-left outline-none transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/40',
                      isSelected && 'shadow-[0_0_0_1px_rgba(242,179,80,0.45),0_20px_50px_-20px_rgba(242,179,80,0.25)]'
                    )}
                  >
                    <div className="bezel-core relative flex h-full flex-col gap-5 p-7">
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            'flex size-12 items-center justify-center rounded-full ring-1 transition-colors duration-500',
                            isSelected
                              ? 'bg-primary/15 text-primary ring-primary/30'
                              : 'bg-white/[0.05] text-muted-foreground ring-white/[0.08]'
                          )}
                        >
                          <RoleIcon className="size-5" />
                        </span>
                        <span
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full ring-1 transition-all duration-500',
                            isSelected
                              ? 'bg-primary text-primary-foreground ring-primary/50'
                              : 'bg-transparent text-transparent ring-white/[0.12]'
                          )}
                          aria-hidden="true"
                        >
                          <CheckIcon className="size-3.5" strokeWidth={2} />
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                          {title}
                        </span>
                        <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selected || loading}
            size="lg"
            className="w-full sm:w-auto sm:min-w-72"
          >
            {loading ? 'Creando cuenta…' : 'Completar registro'}
            {!loading && (
              <ButtonIconIsland>
                <ArrowRightIcon className="size-3.5" />
              </ButtonIconIsland>
            )}
          </Button>

          <p className="text-sm text-muted-foreground">
            ¿Ya tenés una cuenta?{' '}
            <a
              href="/login"
              className="font-medium text-primary underline-offset-4 transition-opacity duration-300 hover:underline"
            >
              Iniciá sesión
            </a>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
