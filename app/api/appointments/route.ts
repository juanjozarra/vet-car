import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { vehicleId, workshopId, title, scheduledAt, notes } = await request.json()

  if (!vehicleId || !title || !scheduledAt) {
    return NextResponse.json(
      { error: 'vehicleId, title, and scheduledAt are required' },
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

  try {
    const appointment = await prisma.appointment.create({
      data: {
        title,
        scheduledAt: parsedDate,
        notes: notes || null,
        vehicleId,
        workshopId: workshopId || null,
      },
    })
    return NextResponse.json(appointment, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
