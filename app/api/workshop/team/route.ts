import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'MECHANIC' || !session.user.workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mechanics = await prisma.user.findMany({
    where: { workshopId: session.user.workshopId },
    select: { id: true, name: true, email: true, workshopRole: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(mechanics)
}
