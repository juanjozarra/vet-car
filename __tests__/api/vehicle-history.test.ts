jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/vehicleAccess', () => ({ canAccessVehicleHistory: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { historyEntry: { create: jest.fn() } },
}))

import { POST } from '@/app/api/vehicles/[id]/history/route'
import { getServerSession } from 'next-auth'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'
import { prisma } from '@/lib/prisma'

function makeRequest(body: object) {
  return new Request('http://localhost/api/vehicles/v1/history', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: 'v1' })
const validBody = {
  type: 'MAINTENANCE',
  description: 'Cambio de aceite',
  performedAt: '2026-01-01',
  odometerReading: 50000,
  cost: 100,
  photoUrl: null,
}

describe('POST /api/vehicles/[id]/history', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the user cannot access the vehicle', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(false)
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when type is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, type: 'NOT_A_TYPE' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, description: '' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when performedAt is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, performedAt: 'not-a-date' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when odometerReading is not a number', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, odometerReading: 'abc' }), { params })
    expect(res.status).toBe(400)
  })

  it('returns 400 when cost is not a number', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    const res = await POST(makeRequest({ ...validBody, cost: 'abc' }), { params })
    expect(res.status).toBe(400)
  })

  it('creates an OWNER-sourced entry with no workshopId for an owner', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.historyEntry.create as jest.Mock).mockResolvedValue({ id: 'h1', ...validBody })
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(201)
    expect(prisma.historyEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ vehicleId: 'v1', source: 'OWNER', createdById: 'u1', workshopId: null }),
    })
  })

  it('creates a MECHANIC-sourced entry stamped with the workshopId for a mechanic', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    ;(prisma.historyEntry.create as jest.Mock).mockResolvedValue({ id: 'h2', ...validBody })
    const res = await POST(makeRequest(validBody), { params })
    expect(res.status).toBe(201)
    expect(prisma.historyEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'MECHANIC', createdById: 'm1', workshopId: 'ws1' }),
    })
  })
})
