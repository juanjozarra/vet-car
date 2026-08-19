import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OPEN_WORK_ORDER_STATUSES } from '@/lib/activeRepairs'

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
  if (target?.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 })
  }
  if (target.workshopRole === 'ADMIN') {
    return NextResponse.json({ error: 'No podés quitar a otro administrador' }, { status: 400 })
  }

  // Removal clears workshopId, and every board/access query finds work orders via
  // `mechanic: { workshopId }` — so removing a mechanic with open tickets drops those
  // tickets off the board and makes them un-PATCHable by anyone, permanently.
  const openTickets = await prisma.workOrder.count({
    where: { mechanicId: userId, status: { in: OPEN_WORK_ORDER_STATUSES } },
  })
  if (openTickets > 0) {
    return NextResponse.json(
      {
        error: `Este mecánico tiene ${openTickets} ${openTickets === 1 ? 'ticket abierto' : 'tickets abiertos'}. Reasignalos desde el tablero antes de quitarlo del equipo.`,
      },
      { status: 409 }
    )
  }

  await prisma.user.update({ where: { id: userId }, data: { workshopId: null, workshopRole: null } })
  return new NextResponse(null, { status: 204 })
}
