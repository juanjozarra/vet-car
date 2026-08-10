import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma, WorkshopSpecialty } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== 'MECHANIC') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.workshopId) {
    return NextResponse.json({ error: 'Workshop already set up' }, { status: 409 })
  }

  try {
    const { name, address, phone, email, latitude, longitude, googlePlaceId } = await request.json()

    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const workshop = await prisma.$transaction(async (tx) => {
      const ws = await tx.workshop.create({
        data: {
          name,
          address,
          phone,
          email,
          ...(latitude !== undefined ? { latitude } : {}),
          ...(longitude !== undefined ? { longitude } : {}),
          ...(googlePlaceId !== undefined ? { googlePlaceId } : {}),
        },
      })
      await tx.user.update({
        where: { id: session.user.id },
        data: { workshopId: ws.id, workshopRole: 'ADMIN' },
      })
      return ws
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Ya hay un taller registrado en esa ubicación' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function validateSpecialties(specialties: unknown): string | null {
  if (specialties === undefined) return null
  if (!Array.isArray(specialties)) return 'specialties must be an array'
  const valid = Object.values(WorkshopSpecialty) as string[]
  if (specialties.some((s: string) => !valid.includes(s))) return 'Invalid specialty value'
  return null
}

function validateSlotDuration(slotDurationMinutes: unknown): string | null {
  if (slotDurationMinutes === undefined) return null
  if (typeof slotDurationMinutes !== 'number' || slotDurationMinutes <= 0) {
    return 'slotDurationMinutes must be a positive number'
  }
  return null
}

function validateHours(hours: unknown): string | null {
  if (hours === undefined) return null
  if (!Array.isArray(hours)) return 'hours must be an array'
  for (const h of hours) {
    if (
      typeof h.dayOfWeek !== 'number' || h.dayOfWeek < 0 || h.dayOfWeek > 6 ||
      typeof h.opensMinute !== 'number' || typeof h.closesMinute !== 'number' ||
      h.opensMinute < 0 || h.closesMinute > 1440 || h.opensMinute >= h.closesMinute
    ) {
      return 'Invalid hours entry'
    }
  }
  return null
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { specialties, slotDurationMinutes, latitude, longitude, googlePlaceId, address, hours } = body

  const validationError =
    validateSpecialties(specialties) ?? validateSlotDuration(slotDurationMinutes) ?? validateHours(hours)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
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
