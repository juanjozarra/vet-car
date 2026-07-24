import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'No podés quitarte a vos mismo' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target || target.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 })
  }
  if (target.workshopRole === 'ADMIN') {
    return NextResponse.json({ error: 'No podés quitar a otro administrador' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: userId }, data: { workshopId: null, workshopRole: null } })
  return new NextResponse(null, { status: 204 })
}
