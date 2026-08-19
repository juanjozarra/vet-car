import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseVehicleInput } from '@/lib/vehicleInput'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (session?.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = parseVehicleInput(await request.json())
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: { ...parsed, ownerId: session.user.id },
    })
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'VIN already registered' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
