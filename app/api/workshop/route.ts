import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
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
