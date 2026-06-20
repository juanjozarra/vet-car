'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'

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
      setError('Passwords do not match')
      return
    }

    sessionStorage.setItem('reg_pending', JSON.stringify({ name, email, password }))
    router.push('/select-role')
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#0b1326]">
      {/* Decorative glows */}
      <div className="fixed top-[-10%] right-[-5%] size-96 rounded-full bg-[#2563eb] opacity-10 blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] size-80 rounded-full bg-[#2563eb] opacity-10 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[448px] flex flex-col gap-6 z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl border border-[#434655] bg-[#222a3d]">
            <CarIcon color="#b4c5ff" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#dae2fd]">Create Account</h1>
            <p className="text-sm text-[#c3c6d7]">Fill in your details to get started</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#222a3d] p-8 flex flex-col gap-5">
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#dae2fd]">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <UserIcon />
                </span>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-[#222a3d] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-3 py-3 outline-none focus:border-[#2563eb] transition-colors"
                />
              </div>
            </div>

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
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-[#222a3d] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-3 py-3 outline-none focus:border-[#2563eb] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#dae2fd]">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-[#222a3d] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-10 py-3 outline-none focus:border-[#2563eb] transition-colors"
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

            {/* Confirm Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm" className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#dae2fd]">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-[#222a3d] bg-[#131b2e] text-sm text-[#dae2fd] placeholder:text-[#434655] pl-10 pr-10 py-3 outline-none focus:border-[#2563eb] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                className="mt-0.5 w-4 h-4 rounded border border-[#434655] bg-[#131b2e] accent-[#2563eb] shrink-0"
              />
              <span className="text-sm text-[#c3c6d7]">
                I agree to the{' '}
                <span className="font-medium text-[#b4c5ff] cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="font-medium text-[#b4c5ff] cursor-pointer">Privacy Policy</span>
              </span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              Continue
              <ArrowRightIcon />
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-sm text-center text-[#c3c6d7]">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-[#b4c5ff] hover:opacity-80 transition-opacity">
            Log in
          </Link>
        </p>
      </motion.div>

      <p className="absolute bottom-6 text-xs text-[#c3c6d7]/50">
        © 2024 AutoStream Pro. All rights reserved.
      </p>
    </main>
    </MotionConfig>
  )
}
