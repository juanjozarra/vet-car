import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { nickname, vin, make, model, year, plate, plateState, mileage } =
    await request.json()

  if (!make || !model || !year) {
    return NextResponse.json(
      { error: 'Make, model, and year are required' },
      { status: 400 }
    )
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        nickname: nickname || null,
        vin: vin || null,
        make,
        model,
        year: parseInt(year, 10),
        plate: plate || null,
        plateState: plateState || null,
        mileage: mileage ? parseInt(mileage, 10) : null,
        ownerId: session.user.id,
      },
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
