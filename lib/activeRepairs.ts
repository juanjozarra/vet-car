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

// The board is a live workspace, not an archive: open tickets plus anything closed
// in the last 24h, so a returning vehicle never shows next to its own old tickets.
export function boardWorkOrdersWhere(workshopId: string): Prisma.WorkOrderWhereInput {
  return {
    mechanic: { workshopId },
    OR: [
      { status: { in: OPEN_WORK_ORDER_STATUSES } },
      {
        status: { in: CLOSED_WORK_ORDER_STATUSES },
        closedAt: { gte: new Date(Date.now() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
      },
    ],
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
