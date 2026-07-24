import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { WorkOrderStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ON_STATUS_CHANGE } from '@/lib/workOrderStatusEffects'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const workOrder = await prisma.workOrder.findUnique({
    where: { id },
    include: { mechanic: { select: { workshopId: true } } },
  })
  if (!workOrder || workOrder.mechanic.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
  }

  const { status, mechanicId, title, description } = await request.json()

  if (status !== undefined && !Object.values(WorkOrderStatus).includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (mechanicId !== undefined) {
    const target = await prisma.user.findUnique({ where: { id: mechanicId }, select: { workshopId: true } })
    if (!target || target.workshopId !== session.user.workshopId) {
      return NextResponse.json({ error: 'El mecánico debe pertenecer a tu taller' }, { status: 400 })
    }
  }

  const updated = await prisma.$transaction(async tx => {
    const result = await tx.workOrder.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(mechanicId !== undefined ? { mechanicId } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    })
    if (status !== undefined) {
      const effect = ON_STATUS_CHANGE[status as WorkOrderStatus]
      if (effect) await effect(tx, result, session.user.workshopId!)
    }
    return result
  })

  return NextResponse.json(updated)
}
