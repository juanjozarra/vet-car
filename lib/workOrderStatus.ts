import { WorkOrderStatus } from '@prisma/client'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

export const WORK_ORDER_STATUS_OPTIONS = Object.values(WorkOrderStatus).map(value => ({
  value,
  label: WORK_ORDER_STATUS_LABELS[value],
}))
