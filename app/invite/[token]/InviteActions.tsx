'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, ButtonIconIsland } from '@/components/ui/button'
import { CheckIcon, CloseIcon } from '@/components/ui/icons'

export function InviteActions({ token }: { token: string }) {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function respond(action: 'accept' | 'decline') {
    setError(null)
    setLoading(action)
    const res = await fetch(`/api/invites/${token}/${action}`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Algo salió mal')
      setLoading(null)
      return
    }
    if (action === 'accept') {
      await update()
    }
    router.push('/mechanic')
    router.refresh()
  }

  return (
    <div className="bezel">
      <div className="bezel-core flex flex-col gap-4 p-8">
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-[#ffb3ae] ring-1 ring-destructive/25"
          >
            {error}
          </p>
        )}
        <Button onClick={() => respond('accept')} disabled={loading !== null} size="lg" className="w-full">
          {loading === 'accept' ? 'Aceptando…' : 'Aceptar invitación'}
          <ButtonIconIsland>
            <CheckIcon className="size-3.5" />
          </ButtonIconIsland>
        </Button>
        <Button
          onClick={() => respond('decline')}
          variant="secondary"
          disabled={loading !== null}
          size="lg"
          className="w-full"
        >
          {loading === 'decline' ? 'Rechazando…' : 'Rechazar'}
          <ButtonIconIsland>
            <CloseIcon className="size-3.5" />
          </ButtonIconIsland>
        </Button>
      </div>
    </div>
  )
}
