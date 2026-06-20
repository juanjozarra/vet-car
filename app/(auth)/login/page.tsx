'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'

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
      setError('Invalid email or password')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#0b1326]">
      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="relative w-full max-w-[448px] rounded-2xl border border-[#222a3d] p-10 flex flex-col gap-8 overflow-hidden"
        style={{ boxShadow: '0px 25px 50px -12px rgba(0,0,0,0.4)' }}
      >

        {/* Decorative blue glow */}
        <div className="absolute -top-32 -left-32 size-64 rounded-full bg-[#2563eb] opacity-20 blur-[48px] pointer-events-none" />

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 z-10">
          <div className="flex items-center gap-3">
            <CarIcon color="#b4c5ff" />
            <span className="text-[28px] font-bold tracking-[-0.5px] text-[#dae2fd]">
              AutoStream Pro
            </span>
          </div>
          <p className="text-sm text-[#c3c6d7]">Sign in to manage your operations</p>
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
                className="text-sm text-center text-[#ffb4ab] bg-[#93000a]/30 border border-[#93000a] rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#dae2fd]">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <MailIcon />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@autostream.com"
                className="w-full rounded-lg border border-[#434655] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-3 py-3 outline-none focus:border-[#2563eb] transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#dae2fd]">
                Password
              </label>
              <span className="text-[11px] font-medium text-[#b4c5ff] cursor-pointer hover:opacity-80 transition-opacity">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <LockIcon />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-[#434655] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-10 py-3 outline-none focus:border-[#2563eb] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="remember"
              className="w-4 h-4 rounded border border-[#434655] bg-[#131b2e] accent-[#2563eb]"
            />
            <span className="text-sm text-[#c3c6d7]">Remember me for 30 days</span>
          </label>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading && <ArrowRightIcon />}
          </motion.button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center text-[#c3c6d7] z-10">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-[#b4c5ff] hover:opacity-80 transition-opacity">
            Register now
          </Link>
        </p>
      </motion.div>
    </main>
    </MotionConfig>
  )
}
