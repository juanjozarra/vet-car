'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { WrenchIcon } from '@/components/ui/icons'

const inputCls =
  'w-full rounded-lg border border-[#5c403c] bg-[#201f20] text-sm text-[#e5e2e3] placeholder:text-[#5c403c] px-4 py-3 outline-none focus:border-[#0055ff] transition-colors'

const labelCls =
  'text-[11px] font-medium tracking-[0.08em] uppercase text-[#e5e2e3]'

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
      {/* Decorative glows */}
      <div className="fixed top-[-10%] right-[-5%] size-96 rounded-full bg-[#ff5544] opacity-10 blur-[80px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] size-96 rounded-full bg-[#ff5544] opacity-10 blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[448px] flex flex-col gap-6 z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-xl border border-[#5c403c] bg-[#2a2a2b]">
            <WrenchIcon />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#e5e2e3]" style={{ fontFamily: 'var(--font-vietnam)' }}>
              Set up your workshop
            </h1>
            <p className="text-sm text-[#e5beb8]">Tell us about your workshop to get started.</p>
          </div>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl border border-[#5c403c] bg-[#1c1b1c] overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-[#ff5544] opacity-40" />

          <div className="p-8 flex flex-col gap-5">
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
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-name" className={labelCls} style={{ fontFamily: 'var(--font-vietnam)' }}>
                  Workshop name
                </label>
                <input
                  id="ws-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Smith's Auto Repair"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ws-address" className={labelCls} style={{ fontFamily: 'var(--font-vietnam)' }}>
                  Address
                </label>
                <input
                  id="ws-address"
                  name="address"
                  type="text"
                  required
                  placeholder="123 Main St, City, State"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ws-phone" className={labelCls} style={{ fontFamily: 'var(--font-vietnam)' }}>
                  Phone
                </label>
                <input
                  id="ws-phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ws-email" className={labelCls} style={{ fontFamily: 'var(--font-vietnam)' }}>
                  Workshop email
                </label>
                <input
                  id="ws-email"
                  name="email"
                  type="email"
                  required
                  placeholder="workshop@example.com"
                  className={inputCls}
                />
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-[#5c0001] bg-[#ff5544] hover:bg-[#e03d30] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)', fontFamily: 'var(--font-vietnam)' }}
              >
                {loading ? 'Creating workshop…' : 'Create workshop'}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
