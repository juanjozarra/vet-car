'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { getInitials } from '@/lib/utils'
import styles from './AvatarMenu.module.scss'

export function AvatarMenu({
  userName,
  userEmail,
  userImage,
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
}) {
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
          aria-label="Abrir menú de usuario"
          aria-expanded={open}
          aria-haspopup="true"
          className={`${styles.trigger} size-8 rounded-full overflow-hidden flex items-center justify-center cursor-pointer`}
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className={styles.initials}>{getInitials(userName)}</span>
          )}
        </button>

        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
              className={`${styles.dropdown} absolute right-0 top-10 w-52 rounded-lg overflow-hidden z-50`}
            >
              <div className={`${styles.dropdownHeader} px-4 py-3`}>
                <p className={`${styles.userName} text-sm font-semibold truncate`}>{userName}</p>
                {userEmail && (
                  <p className={`${styles.userEmail} text-xs truncate mt-0.5`}>{userEmail}</p>
                )}
              </div>
              <div className="py-1">
                <Link
                  href="/owner/profile"
                  onClick={() => setOpen(false)}
                  className={`${styles.menuItem} block px-4 py-2.5 text-sm`}
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className={`${styles.signOutBtn} px-4 py-2.5 text-sm`}
                >
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
