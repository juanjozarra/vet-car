import { WorkshopSpecialty } from '@prisma/client'

export const WORKSHOP_SPECIALTY_LABELS: Record<WorkshopSpecialty, string> = {
  MECANICA_GENERAL: 'Mecánica general',
  ELECTRICIDAD_AUTOMOTRIZ: 'Electricidad automotriz',
  CHAPA_Y_PINTURA: 'Chapa y pintura',
  NEUMATICOS_Y_LLANTAS: 'Neumáticos y llantas',
  DIAGNOSTICO_ELECTRONICO: 'Diagnóstico electrónico',
  TRANSMISION: 'Transmisión',
  AIRE_ACONDICIONADO: 'Aire acondicionado',
  OTRO: 'Otro',
}

export const WORKSHOP_SPECIALTY_OPTIONS = Object.values(WorkshopSpecialty).map(value => ({
  value,
  label: WORKSHOP_SPECIALTY_LABELS[value],
}))
