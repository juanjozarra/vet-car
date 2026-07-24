import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { vehicleId, workshopId, title, scheduledAt, notes } = await request.json()

  if (!vehicleId || !workshopId || !title || !scheduledAt) {
    return NextResponse.json(
      { error: 'vehicleId, workshopId, title, and scheduledAt are required' },
      { status: 400 }
    )
  }

  const parsedDate = new Date(scheduledAt)
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt' }, { status: 400 })
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
  if (!vehicle || vehicle.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    include: { hours: true },
  })
  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
  }

  const existing = await prisma.appointment.findMany({
    where: { workshopId, status: { not: 'CANCELLED' } },
    select: { scheduledAt: true },
  })

  const validSlots = getAvailableSlots({
    hours: workshop.hours,
    slotDurationMinutes: workshop.slotDurationMinutes,
    bookedTimes: existing.map(e => e.scheduledAt),
    now: new Date(),
  })
  const isValidSlot = validSlots.some(s => s.getTime() === parsedDate.getTime())
  if (!isValidSlot) {
    return NextResponse.json({ error: 'El horario seleccionado ya no está disponible' }, { status: 409 })
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        title,
        scheduledAt: parsedDate,
        notes: notes || null,
        vehicleId,
        workshopId,
      },
    })
    return NextResponse.json(appointment, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'El horario seleccionado ya no está disponible' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
