import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPendingInvite } from '@/lib/workshopInvite'

export async function resolveInviteRequest(token: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const invite = await getPendingInvite(token)
  if (!invite) {
    return { ok: false as const, response: NextResponse.json({ error: 'Invitación no válida' }, { status: 410 }) }
  }
  if (session.user.role !== 'MECHANIC' || session.user.email !== invite.email) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Esta invitación es para otra cuenta' }, { status: 403 }),
    }
  }

  return { ok: true as const, session, invite }
}
