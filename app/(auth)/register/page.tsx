// app/(auth)/register/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './register.module.scss'

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
      <main className={`${styles.page} min-h-screen flex flex-col items-center justify-center px-4 py-12`}>
        <div className={styles.glowTopRight} />
        <div className={styles.glowBottomLeft} />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[448px] flex flex-col gap-6 z-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={styles.iconWrapper}>
              <CarIcon color="#55d8e1" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className={styles.heading}>Create Account</h1>
              <p className={styles.subheading}>Fill in your details to get started</p>
            </div>
          </div>

          {/* Card */}
          <div className={`${styles.card} p-8 flex flex-col gap-5`}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.p key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className={styles.errorMsg}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className={styles.label}>Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></span>
                  <input id="name" name="name" type="text" required autoComplete="name"
                    placeholder="John Doe" className={styles.inputIconLeft} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><MailIcon /></span>
                  <input id="email" name="email" type="email" required autoComplete="email"
                    placeholder="you@example.com" className={styles.inputIconLeft} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    required minLength={8} autoComplete="new-password"
                    placeholder="Min. 8 characters" className={styles.inputIconBoth} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirm" className={styles.label}>Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <input id="confirm" name="confirm" type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    placeholder="Repeat your password" className={styles.inputIconBoth} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" required
                  className="mt-0.5 w-4 h-4 rounded accent-[#55d8e1] shrink-0" />
                <span className={styles.termsText}>
                  I agree to the{' '}
                  <span className={styles.termsLink}>Terms of Service</span>
                  {' '}and{' '}
                  <span className={styles.termsLink}>Privacy Policy</span>
                </span>
              </label>

              <motion.button type="submit"
                whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                className={styles.submitBtn}>
                Continue
                <ArrowRightIcon />
              </motion.button>
            </form>
          </div>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.footerLink}>Log in</Link>
          </p>
        </motion.div>

        <p className={`${styles.copyright} absolute bottom-6`}>
          © 2024 AutoStream Pro. All rights reserved.
        </p>
      </main>
    </MotionConfig>
  )
}
