import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { WorkshopSpecialty } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MECHANIC') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.workshopId) {
    return NextResponse.json({ error: 'Workshop already set up' }, { status: 409 })
  }

  try {
    const { name, address, phone, email } = await request.json()

    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workshop = await prisma.$transaction(async (tx) => {
      const ws = await tx.workshop.create({
        data: { name, address, phone, email },
      })
      await tx.user.update({
        where: { id: session.user.id },
        data: { workshopId: ws.id },
      })
      return ws
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { specialties, slotDurationMinutes, latitude, longitude, googlePlaceId, address, hours } = body

  if (specialties !== undefined) {
    if (!Array.isArray(specialties)) {
      return NextResponse.json({ error: 'specialties must be an array' }, { status: 400 })
    }
    const valid = Object.values(WorkshopSpecialty) as string[]
    if (specialties.some((s: string) => !valid.includes(s))) {
      return NextResponse.json({ error: 'Invalid specialty value' }, { status: 400 })
    }
  }

  if (hours !== undefined) {
    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: 'hours must be an array' }, { status: 400 })
    }
    for (const h of hours) {
      if (
        typeof h.dayOfWeek !== 'number' || h.dayOfWeek < 0 || h.dayOfWeek > 6 ||
        typeof h.opensMinute !== 'number' || typeof h.closesMinute !== 'number' ||
        h.opensMinute < 0 || h.closesMinute > 1440 || h.opensMinute >= h.closesMinute
      ) {
        return NextResponse.json({ error: 'Invalid hours entry' }, { status: 400 })
      }
    }
  }

  try {
    const workshop = await prisma.$transaction(async (tx) => {
      const updated = await tx.workshop.update({
        where: { id: session.user.workshopId! },
        data: {
          ...(specialties !== undefined ? { specialties } : {}),
          ...(slotDurationMinutes !== undefined ? { slotDurationMinutes } : {}),
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
          ...(address !== undefined ? { address } : {}),
        },
      })

      if (hours !== undefined) {
        await tx.workshopHours.deleteMany({ where: { workshopId: updated.id } })
        if (hours.length > 0) {
          await tx.workshopHours.createMany({
            data: hours.map((h: { dayOfWeek: number; opensMinute: number; closesMinute: number }) => ({
              workshopId: updated.id,
              dayOfWeek: h.dayOfWeek,
              opensMinute: h.opensMinute,
              closesMinute: h.closesMinute,
            })),
          })
        }
      }

      return updated
    })

    return NextResponse.json(workshop)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
