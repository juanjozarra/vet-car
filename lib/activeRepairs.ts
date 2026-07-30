import type { Prisma } from '@prisma/client'

export const ACTIVE_REPAIR_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

export function activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput {
  return {
    vehicle: { ownerId },
    OR: [
      { status: { in: ['PENDING', 'IN_PROGRESS'] } },
      {
        status: { in: ['COMPLETED', 'CANCELLED'] },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
  }
}
