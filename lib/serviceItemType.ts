import { ServiceItemType } from '@prisma/client'

export const SERVICE_ITEM_TYPE_LABELS: Record<ServiceItemType, string> = {
  REPAIR: 'Reparación',
  MAINTENANCE: 'Mantenimiento',
  UPGRADE: 'Mejora',
  OTHER: 'Otro',
}

export const SERVICE_ITEM_TYPE_OPTIONS = Object.values(ServiceItemType).map(value => ({
  value,
  label: SERVICE_ITEM_TYPE_LABELS[value],
}))
