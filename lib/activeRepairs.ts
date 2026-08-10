import type { Prisma, WorkOrderStatus } from '@prisma/client'

export const ACTIVE_REPAIR_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

// A vehicle counts as "in service" while it has a work order in one of these states.
export const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['PENDING', 'IN_PROGRESS']
export const CLOSED_WORK_ORDER_STATUSES: WorkOrderStatus[] = ['COMPLETED', 'CANCELLED']

function openOrRecentlyClosedOr(): Prisma.WorkOrderWhereInput['OR'] {
  return [
    { status: { in: OPEN_WORK_ORDER_STATUSES } },
    {
      status: { in: CLOSED_WORK_ORDER_STATUSES },
      closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
    },
  ]
}

export function activeRepairsWhere(ownerId: string): Prisma.WorkOrderWhereInput {
  return {
    vehicle: { ownerId },
    OR: openOrRecentlyClosedOr(),
  }
}

// The board is a live workspace, not an archive: it carries open work plus the last 24h
// of closed work, instead of every ticket the workshop has ever created.
export function boardWorkOrdersWhere(workshopId: string): Prisma.WorkOrderWhereInput {
  return {
    mechanic: { workshopId },
    OR: openOrRecentlyClosedOr(),
  }
}

// Turnos still waiting for the vehicle to arrive. A vehicle already in service is
// hidden here — it is on the board as a ticket, and check-in would be rejected.
export function pendingArrivalAppointmentsWhere(workshopId: string): Prisma.AppointmentWhereInput {
  return {
    workshopId,
    status: 'SCHEDULED',
    workOrder: null,
    vehicle: {
      workOrders: {
        none: { status: { in: OPEN_WORK_ORDER_STATUSES }, mechanic: { workshopId } },
      },
    },
  }
}
