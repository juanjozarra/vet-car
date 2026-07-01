import { prisma } from '@/lib/prisma'

export async function getUserImage(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
  return user?.image ?? null
}
