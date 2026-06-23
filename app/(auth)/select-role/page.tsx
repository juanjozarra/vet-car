// app/(auth)/select-role/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './select-role.module.scss'

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
      <main className={`${styles.page} min-h-screen flex flex-col items-center justify-center px-4`}>
        <div className={styles.glowTopRight} />
        <div className={styles.glowBottomLeft} />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[600px] flex flex-col items-center gap-8 z-10"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className={styles.heading}>Welcome to AutoStream Pro!</h1>
            <p className={styles.subheading}>Select your role to complete your registration.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p key="error"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                className={styles.errorMsg}>
                {error}{' '}
                {error.includes('Email already in use') && (
                  <a href="/register" className={styles.errorLink}>Go back to edit</a>
                )}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button type="button" onClick={() => setSelected('MECHANIC')}
              whileHover={{ scale: selected === 'MECHANIC' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={`${styles.roleCard} ${selected === 'MECHANIC' ? styles.roleCardSelected : ''}`}>
              <div className={styles.roleIconWrapper}><WrenchIcon /></div>
              <div className="flex flex-col gap-1">
                <span className={styles.roleTitle}>Mechanic / Shop Owner</span>
                <span className={styles.roleDesc}>Manage clients, vehicles, work orders, and service records.</span>
              </div>
              {selected === 'MECHANIC' && (
                <div className={styles.roleSelectedIndicator}>
                  <div className={styles.selectedDot} />
                  Selected
                </div>
              )}
            </motion.button>

            <motion.button type="button" onClick={() => setSelected('OWNER')}
              whileHover={{ scale: selected === 'OWNER' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={`${styles.roleCard} ${selected === 'OWNER' ? styles.roleCardSelected : ''}`}>
              <div className={styles.roleIconWrapper}><CarIcon color="#55d8e1" /></div>
              <div className="flex flex-col gap-1">
                <span className={styles.roleTitle}>Vehicle Owner</span>
                <span className={styles.roleDesc}>View your vehicle history, track service records, and approve quotes.</span>
              </div>
              {selected === 'OWNER' && (
                <div className={styles.roleSelectedIndicator}>
                  <div className={styles.selectedDot} />
                  Selected
                </div>
              )}
            </motion.button>
          </div>

          <motion.button type="button" onClick={handleContinue}
            disabled={!selected || loading}
            whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className={styles.continueBtn}>
            {loading ? 'Creating account…' : 'Complete Registration'}
            {!loading && <ArrowRightIcon />}
          </motion.button>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <a href="/login" className={styles.footerLink}>Sign in</a>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
