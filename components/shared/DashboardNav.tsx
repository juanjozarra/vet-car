'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { signOut } from 'next-auth/react'
import { motionTokens } from '@/lib/motionTokens'
import { getInitials } from '@/lib/utils'
import { Logo } from './Logo'
import { AvatarMenu } from './AvatarMenu'
import { LogOutIcon } from '@/components/ui/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export interface DashboardNavItem {
  key: string
  href: string
  label: string
}

const DEFAULT_OWNER_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/owner', label: 'Panel' },
  { key: 'schedule', href: '/owner/schedule', label: 'Agendar' },
]

export function DashboardNav({
  userName,
  userEmail,
  userImage,
  items = DEFAULT_OWNER_NAV_ITEMS,
  active = 'panel',
  profileHref = '/owner/profile',
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
  items?: DashboardNavItem[]
  active?: string
  profileHref?: string | null
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <MotionConfig reducedMotion="user">
      {/* Fluid island — floating glass pill detached from the top edge */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-auto mx-auto mt-4 flex w-max max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full bg-black/60 p-2 pl-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.08] backdrop-blur-2xl sm:mt-6">
          <Link
            href={items[0]?.href ?? '/'}
            aria-label="VetCar — inicio"
            className="mr-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            <Logo className="text-lg" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {items.map(item => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active === item.key ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm outline-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-3 focus-visible:ring-ring/40',
                  active === item.key
                    ? 'bg-white/[0.08] text-foreground ring-1 ring-white/[0.07]'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                )}
              >
                {active === item.key && (
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full bg-primary shadow-[0_0_8px_rgba(242,179,80,0.9)]"
                  />
                )}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mx-1.5 hidden h-6 w-px bg-white/[0.08] md:block" />

          <div className="hidden md:block">
            <AvatarMenu
              userName={userName}
              userEmail={userEmail}
              userImage={userImage}
              profileHref={profileHref}
            />
          </div>

          {/* Hamburger → X morph (mobile only) */}
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className="relative ml-1 flex size-9 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] outline-none transition-colors duration-300 hover:bg-white/[0.1] focus-visible:ring-3 focus-visible:ring-ring/40 md:hidden"
          >
            <span
              className={cn(
                'absolute h-px w-4 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                open ? 'rotate-45' : '-translate-y-[3px]'
              )}
            />
            <span
              className={cn(
                'absolute h-px w-4 bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                open ? '-rotate-45' : 'translate-y-[3px]'
              )}
            />
          </button>
        </div>
      </header>

      {/* Full-screen glass menu with staggered mask reveal */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: motionTokens.easing.fluid }}
            className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto bg-black/85 px-6 pt-32 pb-10 backdrop-blur-3xl md:hidden"
          >
            <nav className="flex flex-col" aria-label="Principal">
              {items.map((item, i) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{
                    duration: 0.5,
                    ease: motionTokens.easing.fluid,
                    delay: 0.08 + i * 0.07,
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active === item.key ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-4 py-4 font-display text-4xl font-medium tracking-[-0.02em] transition-colors duration-300',
                      active === item.key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {active === item.key && (
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-primary shadow-[0_0_12px_rgba(242,179,80,0.9)]"
                      />
                    )}
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              {profileHref && (
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{
                    duration: 0.5,
                    ease: motionTokens.easing.fluid,
                    delay: 0.08 + items.length * 0.07,
                  }}
                >
                  <Link
                    href={profileHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 py-4 font-display text-4xl font-medium tracking-[-0.02em] text-muted-foreground transition-colors duration-300 hover:text-foreground"
                  >
                    Mi perfil
                  </Link>
                </motion.div>
              )}
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.24, ease: motionTokens.easing.fluid }}
              className="flex flex-col gap-6"
            >
              <div className="h-px bg-white/[0.08]" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10 bg-white/[0.06]">
                    {userImage && <AvatarImage src={userImage} alt="" />}
                    <AvatarFallback className="bg-white/[0.06] font-mono text-xs font-semibold text-primary">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{userName}</span>
                    {userEmail && (
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-white/[0.08] transition-colors duration-300 hover:text-foreground"
                >
                  <LogOutIcon className="size-3.5" />
                  Salir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
