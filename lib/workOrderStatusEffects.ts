import { Prisma, WorkOrder, WorkOrderStatus } from '@prisma/client'

type StatusEffect = (
  tx: Prisma.TransactionClient,
  workOrder: WorkOrder,
  workshopId: string
) => Promise<void>

export const ON_STATUS_CHANGE: Partial<Record<WorkOrderStatus, StatusEffect>> = {
  COMPLETED: async (tx, workOrder, workshopId) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({
        where: { id: workOrder.appointmentId },
        data: { status: 'COMPLETED' },
      })
    }

    const existing = await tx.historyEntry.findFirst({ where: { workOrderId: workOrder.id } })
    if (!existing) {
      await tx.historyEntry.create({
        data: {
          vehicleId: workOrder.vehicleId,
          type: 'OTHER',
          description: workOrder.description
            ? `${workOrder.title} — ${workOrder.description}`
            : workOrder.title,
          performedAt: new Date(),
          source: 'MECHANIC',
          createdById: workOrder.mechanicId,
          workshopId,
          workOrderId: workOrder.id,
        },
      })
    }
  },
  CANCELLED: async (tx, workOrder) => {
    if (workOrder.appointmentId) {
      await tx.appointment.update({
        where: { id: workOrder.appointmentId },
        data: { status: 'CANCELLED' },
      })
    }
  },
}
