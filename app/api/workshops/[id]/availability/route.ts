import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let workshop
  try {
    workshop = await prisma.workshop.findUnique({
      where: { id },
      include: { hours: true },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!workshop) {
    return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
  }

  try {
    const now = new Date()
    const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    const existing = await prisma.appointment.findMany({
      where: {
        workshopId: id,
        status: { not: 'CANCELLED' },
        scheduledAt: { gte: now, lte: rangeEnd },
      },
      select: { scheduledAt: true },
    })

    const slots = getAvailableSlots({
      hours: workshop.hours,
      slotDurationMinutes: workshop.slotDurationMinutes,
      bookedTimes: existing.map(e => e.scheduledAt),
      now,
    })

    return NextResponse.json({ slots: slots.map(s => s.toISOString()) })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
