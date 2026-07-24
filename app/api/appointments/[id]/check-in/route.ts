import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { workOrder: { select: { id: true } } },
  })
  if (!appointment || appointment.workshopId !== session.user.workshopId) {
    return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
  }
  if (appointment.status !== 'SCHEDULED' || appointment.workOrder) {
    return NextResponse.json({ error: 'El turno ya fue registrado o no está programado' }, { status: 409 })
  }

  try {
    const workOrder = await prisma.workOrder.create({
      data: {
        title: appointment.title,
        description: appointment.notes,
        status: 'PENDING',
        vehicleId: appointment.vehicleId,
        mechanicId: session.user.id,
        appointmentId: appointment.id,
      },
    })
    return NextResponse.json(workOrder, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'El turno ya fue registrado' }, { status: 409 })
    }
    throw err
  }
}
