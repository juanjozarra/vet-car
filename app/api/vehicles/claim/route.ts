import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { vin } = await request.json()
  if (typeof vin !== 'string' || vin.trim() === '') {
    return NextResponse.json({ error: 'Ingresá el VIN de tu vehículo' }, { status: 400 })
  }

  // Vehicles are stored with an uppercased VIN (lib/vehicleInput.ts), so match that.
  const normalizedVin = vin.trim().toUpperCase()

  // One conditional write rather than read-then-write: `ownerId: null` in the
  // filter is what makes two owners racing for the same VIN impossible, and it
  // collapses "no such VIN" and "already claimed" into the same zero-count
  // result. That identical 404 is deliberate — distinguishing the two would let
  // a caller enumerate which VINs exist in the system.
  const { count } = await prisma.vehicle.updateMany({
    where: { vin: normalizedVin, ownerId: null },
    data: { ownerId: session.user.id },
  })
  if (count === 0) {
    return NextResponse.json(
      { error: 'No encontramos un vehículo sin dueño con ese VIN' },
      { status: 404 }
    )
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { vin: normalizedVin } })
  return NextResponse.json(vehicle)
}
