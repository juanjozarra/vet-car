import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseHistoryEntryInput } from '@/lib/vehicleHistory'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.historyEntry.findUnique({ where: { id } })
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
  }

  const parsed = parseHistoryEntryInput(await request.json())
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const updated = await prisma.historyEntry.update({
    where: { id },
    data: parsed,
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.historyEntry.findUnique({ where: { id } })
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: 'History entry not found' }, { status: 404 })
  }

  await prisma.historyEntry.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
