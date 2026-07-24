'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPlusIcon, TrashIcon, MailIcon, CloseIcon } from '@/components/ui/icons'
import { getInitials } from '@/lib/utils'

type Mechanic = { id: string; name: string | null; email: string; role: 'ADMIN' | 'STAFF' }
type PendingInvite = { id: string; email: string; createdAt: string; expiresAt: string }

interface TeamRosterProps {
  currentUserId: string
  isAdmin: boolean
  mechanics: Mechanic[]
  pendingInvites: PendingInvite[]
}

const sectionLabel =
  'font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70'
const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })

const enter = (delay: number) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})

export function TeamRoster({ currentUserId, isAdmin, mechanics, pendingInvites }: TeamRosterProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [rosterError, setRosterError] = useState<string | null>(null)

  async function handleInvite(e: FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSubmitting(true)
    try {
      const res = await fetch('/api/workshop/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        setInviteError(data.error ?? 'No se pudo enviar la invitación')
        return
      }
      setInviteOpen(false)
      setInviteEmail('')
      router.refresh()
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleRemove(userId: string) {
    setRosterError(null)
    setRemovingId(userId)
    try {
      const res = await fetch(`/api/workshop/team/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRosterError(data.error ?? 'No se pudo quitar al mecánico')
        return
      }
      router.refresh()
    } finally {
      setRemovingId(null)
    }
  }

  async function handleCancelInvite(id: string) {
    setRosterError(null)
    setCancelingId(id)
    try {
      const res = await fetch(`/api/workshop/invites/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRosterError(data.error ?? 'No se pudo cancelar la invitación')
        return
      }
      router.refresh()
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-8">
        <motion.div {...enter(0)} className="flex flex-col gap-4">
          <span className="eyebrow">
            <span className="size-1 rounded-full bg-primary" aria-hidden="true" />
            Equipo
          </span>
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Tu equipo de mecánicos.
          </h1>
        </motion.div>

        {rosterError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
          >
            {rosterError}
          </p>
        )}
        <motion.div {...enter(0.1)} className="flex flex-col gap-5">
          <div className="flex items-center justify-between px-1">
            <h2 className={sectionLabel}>Mecánicos</h2>
            {isAdmin && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                Invitar mecánico
                <ButtonIconIsland>
                  <UserPlusIcon className="size-3.5" />
                </ButtonIconIsland>
              </Button>
            )}
          </div>
          <div className="bezel">
            <div className="bezel-core flex flex-col">
              {mechanics.map(m => (
                <div key={m.id} className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0">
                  <Avatar className="size-10 bg-white/[0.06]">
                    <AvatarFallback className="bg-white/[0.06] font-mono text-xs font-semibold text-primary">
                      {getInitials(m.name ?? m.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-foreground">{m.name ?? m.email}</span>
                    <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                  </div>
                  <Badge variant={m.role === 'ADMIN' ? 'active' : 'idle'}>
                    {m.role === 'ADMIN' ? 'Admin' : 'Staff'}
                  </Badge>
                  {isAdmin && m.role !== 'ADMIN' && m.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={removingId === m.id}
                      onClick={() => handleRemove(m.id)}
                      aria-label={`Quitar a ${m.name ?? m.email}`}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {isAdmin && (
          <motion.div {...enter(0.18)} className="flex flex-col gap-5">
            <h2 className={`${sectionLabel} px-1`}>Invitaciones pendientes</h2>
            {pendingInvites.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">No hay invitaciones pendientes.</p>
            ) : (
              <div className="bezel">
                <div className="bezel-core flex flex-col">
                  {pendingInvites.map(invite => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.04] text-muted-foreground ring-1 ring-white/[0.08]">
                        <MailIcon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">{invite.email}</span>
                        <span className="text-xs text-muted-foreground">
                          Vence el {DATE_FORMATTER.format(new Date(invite.expiresAt))}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={cancelingId === invite.id}
                        onClick={() => handleCancelInvite(invite.id)}
                        aria-label={`Cancelar invitación a ${invite.email}`}
                      >
                        <CloseIcon className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar mecánico</DialogTitle>
            <DialogDescription>Le enviamos un correo con un enlace para unirse a tu taller.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            {inviteError && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
              >
                {inviteError}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Correo electrónico</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="mecanico@ejemplo.com"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={inviteSubmitting}>
                {inviteSubmitting ? 'Enviando…' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  )
}
