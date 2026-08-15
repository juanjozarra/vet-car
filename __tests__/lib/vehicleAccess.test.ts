jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  },
}))

import { canAccessVehicleHistory, getWorkshopVehicles } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

describe('canAccessVehicleHistory', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns true for an owner who owns the vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ ownerId: 'u1' })
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(true)
  })

  it('returns false for an owner who does not own the vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ ownerId: 'someone-else' })
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(false)
  })

  // The property the whole nullable-ownerId design rests on: a walk-in vehicle
  // the workshop entered belongs to nobody, so no owner may read its history.
  it('returns false for an owner when the vehicle has no owner at all', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ ownerId: null })
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(false)
  })

  it('returns false for an owner when the vehicle does not exist', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'OWNER', workshopId: null }, 'v1')
    expect(result).toBe(false)
  })

  it('returns false for a mechanic with no workshop, without querying', async () => {
    const result = await canAccessVehicleHistory({ id: 'u1', role: 'MECHANIC', workshopId: null }, 'v1')
    expect(result).toBe(false)
    expect(prisma.vehicle.findFirst).not.toHaveBeenCalled()
  })

  it('returns true for a mechanic whose workshop has served the vehicle', async () => {
    ;(prisma.vehicle.findFirst as jest.Mock).mockResolvedValue({ id: 'v1' })
    const result = await canAccessVehicleHistory({ id: 'm1', role: 'MECHANIC', workshopId: 'ws1' }, 'v1')
    expect(result).toBe(true)
    expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'v1',
        OR: [
          { appointments: { some: { workshopId: 'ws1' } } },
          { workOrders: { some: { mechanic: { workshopId: 'ws1' } } } },
        ],
      },
      select: { id: true },
    })
  })

  it('returns false for a mechanic whose workshop has never served the vehicle', async () => {
    ;(prisma.vehicle.findFirst as jest.Mock).mockResolvedValue(null)
    const result = await canAccessVehicleHistory({ id: 'm1', role: 'MECHANIC', workshopId: 'ws1' }, 'v1')
    expect(result).toBe(false)
  })
})

describe('getWorkshopVehicles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('queries vehicles linked to the workshop via appointments or work orders', async () => {
    ;(prisma.vehicle.findMany as jest.Mock).mockResolvedValue([{ id: 'v1' }])
    const result = await getWorkshopVehicles('ws1')
    expect(result).toEqual([{ id: 'v1' }])
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { appointments: { some: { workshopId: 'ws1' } } },
          { workOrders: { some: { mechanic: { workshopId: 'ws1' } } } },
        ],
      },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })
})
