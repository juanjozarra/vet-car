'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'

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
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('reg_pending')

    const result = await signIn('credentials', { email, password, redirect: false })

    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.')
      router.push('/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0b1326]">
      {/* Decorative glows */}
      <div className="fixed top-[-10%] right-[-5%] size-96 rounded-full bg-[#2563eb] opacity-10 blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] size-96 rounded-full bg-[#2563eb] opacity-10 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[600px] flex flex-col items-center gap-8 z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] text-[#dae2fd]">
            Welcome to AutoStream Pro!
          </h1>
          <p className="text-base text-[#c3c6d7]">
            Select your role to complete your registration.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
              className="w-full text-sm text-center text-[#ffb4ab] bg-[#93000a]/30 border border-[#93000a] rounded-lg px-3 py-2"
            >
              {error}{' '}
              {error.includes('Email already in use') && (
                <a href="/register" className="underline text-[#b4c5ff]">Go back to edit</a>
              )}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Role cards */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            type="button"
            onClick={() => setSelected('MECHANIC')}
            whileHover={{ scale: selected === 'MECHANIC' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            className={[
              'flex flex-col gap-4 rounded-xl border p-8 text-left transition-all cursor-pointer',
              selected === 'MECHANIC'
                ? 'border-[#2563eb] bg-[#131b2e] shadow-[0_0_0_1px_#2563eb]'
                : 'border-[#434655] bg-[#131b2e] hover:border-[#8d90a0]',
            ].join(' ')}
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-[#222a3d]">
              <WrenchIcon />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-[#dae2fd]">Mechanic / Shop Owner</span>
              <span className="text-sm text-[#c3c6d7]">
                Manage clients, vehicles, work orders, and service records.
              </span>
            </div>
            {selected === 'MECHANIC' && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#b4c5ff]">
                <div className="size-1.5 rounded-full bg-[#2563eb]" />
                Selected
              </div>
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setSelected('OWNER')}
            whileHover={{ scale: selected === 'OWNER' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            className={[
              'flex flex-col gap-4 rounded-xl border p-8 text-left transition-all cursor-pointer',
              selected === 'OWNER'
                ? 'border-[#2563eb] bg-[#131b2e] shadow-[0_0_0_1px_#2563eb]'
                : 'border-[#434655] bg-[#131b2e] hover:border-[#8d90a0]',
            ].join(' ')}
          >
            <div className="flex items-center justify-center size-12 rounded-full bg-[#222a3d]">
              <CarIcon color="#b4c5ff" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-[#dae2fd]">Vehicle Owner</span>
              <span className="text-sm text-[#c3c6d7]">
                View your vehicle history, track service records, and approve quotes.
              </span>
            </div>
            {selected === 'OWNER' && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#b4c5ff]">
                <div className="size-1.5 rounded-full bg-[#2563eb]" />
                Selected
              </div>
            )}
          </motion.button>
        </div>

        {/* Continue */}
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!selected || loading}
          whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
          whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white bg-[#2563eb] disabled:opacity-40 hover:bg-[#1d4ed8] disabled:cursor-not-allowed transition-all"
          style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
        >
          {loading ? 'Creating account…' : 'Complete Registration'}
          {!loading && <ArrowRightIcon />}
        </motion.button>

        <p className="text-sm text-[#c3c6d7]">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-[#b4c5ff] hover:opacity-80 transition-opacity">
            Sign in
          </a>
        </p>
      </motion.div>
    </main>
    </MotionConfig>
  )
}
