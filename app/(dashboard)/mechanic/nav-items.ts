import type { DashboardNavItem } from '@/components/shared/DashboardNav'

export const MECHANIC_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/mechanic', label: 'Panel' },
  { key: 'vehicles', href: '/mechanic/vehicles', label: 'Vehículos' },
  { key: 'team', href: '/mechanic/team', label: 'Equipo' },
  { key: 'settings', href: '/mechanic/settings', label: 'Configuración' },
]
