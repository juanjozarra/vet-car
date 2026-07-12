'use client'

import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { Logo } from './Logo'

// Editorial Split — massive display typography on the left, the actual
// task on the right. Collapses to a single centered column below lg.
export function AuthShell({
  eyebrow,
  headline,
  sub,
  children,
}: {
  eyebrow: string
  headline: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="relative grid min-h-[100dvh] w-full lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] p-12 lg:flex xl:p-16">
          <Logo className="text-xl" />

          <div className="flex flex-col items-start gap-6 pb-12">
            <motion.span
              initial={{ opacity: 0, y: motionTokens.distance.sm }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: motionTokens.easing.fluid }}
              className="eyebrow"
            >
              <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
              {eyebrow}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: motionTokens.distance.lg, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: motionTokens.easing.fluid, delay: 0.08 }}
              className="max-w-[15ch] font-display text-5xl font-medium leading-[1.04] tracking-[-0.03em] text-foreground xl:text-6xl"
            >
              {headline}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: motionTokens.easing.fluid, delay: 0.18 }}
              className="max-w-md text-base leading-relaxed text-muted-foreground"
            >
              {sub}
            </motion.p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/50">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-ok shadow-[0_0_8px_rgba(62,207,142,0.8)]"
            />
            Registro continuo de servicio
          </div>
        </section>

        <section className="relative flex flex-col items-center justify-center px-4 py-14 sm:px-8">
          <div className="mb-10 lg:hidden">
            <Logo className="text-2xl" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.lg, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: motionTokens.easing.fluid, delay: 0.1 }}
            className="w-full max-w-[440px]"
          >
            {children}
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  )
}
