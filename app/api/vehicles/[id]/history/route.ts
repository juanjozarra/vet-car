import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { parseHistoryEntryInput } from '@/lib/vehicleHistory'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: vehicleId } = await params
  const hasAccess = await canAccessVehicleHistory(session.user, vehicleId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const parsed = parseHistoryEntryInput(await request.json())
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const entry = await prisma.historyEntry.create({
    data: {
      vehicleId,
      ...parsed,
      source: session.user.role === 'MECHANIC' ? 'MECHANIC' : 'OWNER',
      createdById: session.user.id,
      workshopId: session.user.role === 'MECHANIC' ? session.user.workshopId : null,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
