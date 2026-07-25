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

// Instrument-pill tint per status — reuses the existing amber/green/neutral
// badge variants plus "danger" (red) instead of inventing new colors.
export const WORK_ORDER_STATUS_BADGE_VARIANT: Record<WorkOrderStatus, 'idle' | 'active' | 'ok' | 'danger'> = {
  PENDING: 'idle',
  IN_PROGRESS: 'active',
  COMPLETED: 'ok',
  CANCELLED: 'danger',
}

// Same mapping as small solid dots for column headers / drop-zone accents.
export const WORK_ORDER_STATUS_DOT_CLASS: Record<WorkOrderStatus, string> = {
  PENDING: 'bg-white/30',
  IN_PROGRESS: 'bg-primary',
  COMPLETED: 'bg-ok',
  CANCELLED: 'bg-destructive',
}
