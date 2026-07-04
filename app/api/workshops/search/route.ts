import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { haversineDistanceKm } from '@/lib/geo'
import { WorkshopSpecialty } from '@prisma/client'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const specialty = searchParams.get('specialty')
  const q = searchParams.get('q')

  const userLat = lat !== null ? Number(lat) : null
  const userLng = lng !== null ? Number(lng) : null

  if (specialty && !(Object.values(WorkshopSpecialty) as string[]).includes(specialty)) {
    return NextResponse.json({ error: 'Invalid specialty' }, { status: 400 })
  }

  const workshops = await prisma.workshop.findMany({
    where: {
      ...(specialty ? { specialties: { has: specialty as WorkshopSpecialty } } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  const withDistance = workshops.map(w => ({
    id: w.id,
    name: w.name,
    address: w.address,
    phone: w.phone,
    specialties: w.specialties,
    latitude: w.latitude,
    longitude: w.longitude,
    distanceKm:
      userLat !== null && userLng !== null && w.latitude !== null && w.longitude !== null
        ? haversineDistanceKm({ lat: userLat, lng: userLng }, { lat: w.latitude, lng: w.longitude })
        : null,
  }))

  withDistance.sort((a, b) => {
    if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name)
    if (a.distanceKm === null) return 1
    if (b.distanceKm === null) return -1
    return a.distanceKm - b.distanceKm
  })

  return NextResponse.json(withDistance)
}
