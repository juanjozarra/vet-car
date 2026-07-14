import { Role } from '@prisma/client'
import { prisma } from './prisma'

export type SessionUser = {
  id: string
  role: Role
  workshopId: string | null
}

export async function canAccessVehicleHistory(user: SessionUser, vehicleId: string): Promise<boolean> {
  if (user.role === 'OWNER') {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { ownerId: true } })
    return vehicle?.ownerId === user.id
  }

  if (!user.workshopId) return false

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      OR: [
        { appointments: { some: { workshopId: user.workshopId } } },
        { workOrders: { some: { mechanic: { workshopId: user.workshopId } } } },
      ],
    },
    select: { id: true },
  })
  return vehicle !== null
}

export async function getWorkshopVehicles(workshopId: string) {
  return prisma.vehicle.findMany({
    where: {
      OR: [
        { appointments: { some: { workshopId } } },
        { workOrders: { some: { mechanic: { workshopId } } } },
      ],
    },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
