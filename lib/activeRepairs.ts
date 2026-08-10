import type { Prisma, WorkOrderStatus } from '@prisma/client'

export const ACTIVE_REPAIR_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

// A vehicle counts as "in service" while it has a work order in one of these states.
export const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS']
export const CLOSED_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

export function activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput {
  return {
    vehicle: { ownerId },
    OR: [
      { status: { in: OPEN_WORK_ORDER_STATUSES } },
      {
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
  }
}
