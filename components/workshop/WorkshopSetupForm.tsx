'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { WrenchIcon } from '@/components/ui/icons'
import styles from './WorkshopSetupForm.module.scss'

export function WorkshopSetupForm() {
  const { update } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const form = e.currentTarget
      const name = (form.elements.namedItem('name') as HTMLInputElement).value
      const address = (form.elements.namedItem('address') as HTMLInputElement).value
      const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
      const email = (form.elements.namedItem('email') as HTMLInputElement).value

      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone, email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to create workshop')
        return
      }

      await update()
      router.push('/mechanic')
      router.refresh()
    } catch {
      setError('Failed to create workshop')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.glowTopRight} />
      <div className={styles.glowBottomLeft} />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[448px] flex flex-col gap-6 z-10"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={styles.iconWrapper}><WrenchIcon /></div>
          <div className="flex flex-col gap-1">
            <h1 className={styles.heading}>Set up your workshop</h1>
            <p className={styles.subheading}>Tell us about your workshop to get started.</p>
          </div>
        </div>

        <div className={`${styles.card} relative`}>
          <div className={styles.topAccent} />
          <div className="p-8 flex flex-col gap-5">
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
                <label htmlFor="ws-name" className={styles.label}>Workshop name</label>
                <input id="ws-name" name="name" type="text" required
                  placeholder="e.g. Smith's Auto Repair" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-address" className={styles.label}>Address</label>
                <input id="ws-address" name="address" type="text" required
                  placeholder="123 Main St, City, State" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-phone" className={styles.label}>Phone</label>
                <input id="ws-phone" name="phone" type="tel" required
                  placeholder="+1 (555) 000-0000" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-email" className={styles.label}>Workshop email</label>
                <input id="ws-email" name="email" type="email" required
                  placeholder="workshop@example.com" className={styles.input} />
              </div>
              <motion.button type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                className={styles.submitBtn}>
                {loading ? 'Creating workshop…' : 'Create workshop'}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
