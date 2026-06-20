'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function AvatarMenu({ userName, userEmail }: { userName: string; userEmail?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open user menu"
          aria-expanded={open}
          aria-haspopup="true"
          className="size-8 rounded-full border border-[#434655] bg-[#222a3d] flex items-center justify-center hover:border-[#8d90a0] transition-colors cursor-pointer"
        >
          <span className="text-[10px] font-semibold text-[#b4c5ff]">
            {getInitials(userName)}
          </span>
        </button>

        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
              className="absolute right-0 top-10 w-52 bg-[#0f1729] border border-[#434655] rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#434655]">
                <p className="text-sm font-semibold text-[#dae2fd] truncate">{userName}</p>
                {userEmail && (
                  <p className="text-xs text-[#8d90a0] truncate mt-0.5">{userEmail}</p>
                )}
              </div>
              {/* Actions */}
              <div className="py-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#ffb4ab] hover:bg-[#93000a]/20 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
