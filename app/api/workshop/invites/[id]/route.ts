import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const invite = await prisma.workshopInvite.findUnique({ where: { id } })
  if (!invite || invite.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  await prisma.workshopInvite.update({ where: { id }, data: { status: 'CANCELLED' } })
  return new NextResponse(null, { status: 204 })
}
