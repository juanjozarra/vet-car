import { prisma } from './prisma'

export async function getPendingInvite(token: string) {
  const invite = await prisma.workshopInvite.findUnique({
    where: { token },
    include: { workshop: { select: { name: true, address: true } } },
  })
  if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
    return null
  }
  return invite
}
