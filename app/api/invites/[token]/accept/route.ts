import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPendingInvite } from '@/lib/workshopInvite'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { token } = await params
  const invite = await getPendingInvite(token)
  if (!invite) {
    return NextResponse.json({ error: 'Invitación no válida' }, { status: 410 })
  }
  if (session.user.role !== 'MECHANIC' || session.user.email !== invite.email) {
    return NextResponse.json({ error: 'Esta invitación es para otra cuenta' }, { status: 403 })
  }
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
