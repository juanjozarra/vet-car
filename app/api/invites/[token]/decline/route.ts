import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveInviteRequest } from '../shared'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveInviteRequest(token)
  if (!resolved.ok) return resolved.response
  const { invite } = resolved

  await prisma.workshopInvite.update({ where: { id: invite.id }, data: { status: 'DECLINED' } })
  return new NextResponse(null, { status: 204 })
}
