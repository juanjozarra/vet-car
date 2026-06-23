// app/(auth)/login/page.tsx
'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './login.module.scss'

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
      <main className={`${styles.page} min-h-screen flex items-center justify-center px-4`}>
        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className={`${styles.card} relative w-full max-w-[448px] p-10 flex flex-col gap-8 overflow-hidden`}
        >
          <div className={styles.glow} />

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="flex items-center gap-3">
              <CarIcon color="#55d8e1" />
              <span className={styles.appName}>AutoStream Pro</span>
            </div>
            <p className={styles.tagline}>Sign in to manage your operations</p>
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
                  className={styles.errorMsg}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <MailIcon />
                </span>
                <input id="email" name="email" type="email" required autoComplete="email"
                  placeholder="admin@autostream.com" className={styles.inputIconLeft} />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={styles.label}>Password</label>
                <span className={styles.forgotLink}>Forgot password?</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password" placeholder="••••••••"
                  className={styles.inputIconBoth} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" name="remember"
                className="w-4 h-4 rounded accent-[#55d8e1]" />
              <span className={styles.rememberText}>Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={styles.submitBtn}>
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRightIcon />}
            </motion.button>
          </form>

          {/* Footer */}
          <p className={`${styles.footerText} z-10`}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.footerLink}>Register now</Link>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
