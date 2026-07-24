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

  await prisma.workshopInvite.update({ where: { id: invite.id }, data: { status: 'DECLINED' } })
  return new NextResponse(null, { status: 204 })
}
