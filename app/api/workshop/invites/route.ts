import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWorkshopInviteEmail } from '@/lib/email'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  const normalizedEmail = email.toLowerCase().trim()

  const targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (targetUser?.role === 'OWNER') {
    return NextResponse.json({ error: 'Ese correo pertenece a un dueño' }, { status: 400 })
  }
  if (targetUser?.role === 'MECHANIC' && targetUser.workshopId) {
    return NextResponse.json({ error: 'Ese mecánico ya pertenece a un taller' }, { status: 409 })
  }

  const workshop = await prisma.workshop.findUnique({
    where: { id: session.user.workshopId! },
    select: { name: true },
  })
  const token = randomBytes(32).toString('hex')
  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

  try {
    await sendWorkshopInviteEmail({
      to: normalizedEmail,
      workshopName: workshop!.name,
      inviterName: session.user.name ?? 'Un administrador',
      acceptUrl,
    })
  } catch (err) {
    // Resend's rejection reason is the only thing that explains *why* an invite
    // failed — an unverified sending domain, a sandbox recipient restriction, a
    // bad key. Swallowing it left admins with an unactionable "no se pudo enviar",
    // so log it and pass it through: the caller here is always a workshop ADMIN.
    const detail = err instanceof Error ? err.message : 'error desconocido'
    console.error('[workshop/invites] Resend rejected the send:', detail)
    return NextResponse.json(
      { error: `No se pudo enviar la invitación: ${detail}` },
      { status: 500 }
    )
  }

  const invite = await prisma.workshopInvite.upsert({
    where: { workshopId_email: { workshopId: session.user.workshopId!, email: normalizedEmail } },
    create: {
      workshopId: session.user.workshopId!,
      email: normalizedEmail,
      token,
      status: 'PENDING',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    update: {
      token,
      status: 'PENDING',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  })

  return NextResponse.json({ id: invite.id, email: invite.email, expiresAt: invite.expiresAt }, { status: 201 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.workshopRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const invites = await prisma.workshopInvite.findMany({
    where: { workshopId: session.user.workshopId!, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, createdAt: true, expiresAt: true },
  })
  return NextResponse.json(invites)
}
