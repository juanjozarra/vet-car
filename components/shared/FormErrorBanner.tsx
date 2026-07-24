'use client'

import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'

export function FormErrorBanner({ error }: { error: string | null | undefined }) {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.p
          key="error"
          role="alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
