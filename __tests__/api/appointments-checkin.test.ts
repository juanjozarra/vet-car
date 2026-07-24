jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    appointment: { findUnique: jest.fn() },
    workOrder: { create: jest.fn() },
  },
}))

import { POST } from '@/app/api/appointments/[id]/check-in/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.appointment.findUnique as jest.Mock
const mockCreate = prisma.workOrder.create as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/appointments/a1/check-in', { method: 'POST' })
}
const params = Promise.resolve({ id: 'a1' })

const mechanicSession = { user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' } }

describe('POST /api/appointments/[id]/check-in', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 for an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic with no workshop', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the appointment does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the appointment belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws-other', status: 'SCHEDULED', workOrder: null })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 409 when the appointment is not SCHEDULED', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws1', status: 'CANCELLED', workOrder: null })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when the appointment already has a work order', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({ id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: { id: 'wo-existing' } })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when a concurrent check-in already claimed the appointment', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({
      id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: null,
      title: 'Cambio de aceite', notes: null, vehicleId: 'v1',
    })
    mockCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.8.0' })
    )
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('creates a WorkOrder from the appointment and returns 201', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockFindUnique.mockResolvedValue({
      id: 'a1', workshopId: 'ws1', status: 'SCHEDULED', workOrder: null,
      title: 'Cambio de aceite', notes: 'Ruido en el motor', vehicleId: 'v1',
    })
    mockCreate.mockResolvedValue({ id: 'wo1', title: 'Cambio de aceite' })
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        title: 'Cambio de aceite',
        description: 'Ruido en el motor',
        status: 'PENDING',
        vehicleId: 'v1',
        mechanicId: 'm1',
        appointmentId: 'a1',
      },
    })
  })
})
