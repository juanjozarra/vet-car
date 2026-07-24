import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveInviteRequest } from '../shared'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInviteRequest(token)
  if (!resolved.ok) return resolved.response
  const { session, invite } = resolved

  if (session.user.workshopId) {
    return NextResponse.json({ error: 'Ya pertenecés a un taller' }, { status: 409 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { workshopId: invite.workshopId, workshopRole: 'STAFF' },
    }),
    prisma.workshopInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } }),
  ])

  return NextResponse.json({ workshopId: invite.workshopId })
}
