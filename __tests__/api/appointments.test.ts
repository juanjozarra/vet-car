import { POST } from '@/app/api/appointments/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/availability', () => ({ getAvailableSlots: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn() },
    workshop: { findUnique: jest.fn() },
    appointment: { create: jest.fn(), findMany: jest.fn() },
  },
}))

const mockSession = { user: { id: 'u1', role: 'OWNER', name: 'Alice', email: 'a@a.com' } }
const validBody = {
  vehicleId: 'v1',
  workshopId: 'w1',
  title: 'Turno en Taller Sur',
  scheduledAt: '2026-08-01T10:00',
}

function makeRequest(body: object) {
  return new Request('http://localhost/api/appointments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/appointments', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when role is MECHANIC', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC' } })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 when vehicleId is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const res = await POST(makeRequest({ ...validBody, vehicleId: undefined }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when scheduledAt is invalid', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const res = await POST(makeRequest({ ...validBody, scheduledAt: 'not-a-date' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the vehicle does not belong to the requesting owner', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ id: 'v1', ownerId: 'someone-else' })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it('returns 404 when the vehicle does not exist', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(404)
  })

  it('returns 201 with appointment data on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({ id: 'v1', ownerId: 'u1' })
    ;(prisma.workshop.findUnique as jest.Mock).mockResolvedValue({ id: 'w1', hours: [], slotDurationMinutes: 60 })
    ;(prisma.appointment.findMany as jest.Mock).mockResolvedValue([])
    ;(getAvailableSlots as jest.Mock).mockReturnValue([new Date(validBody.scheduledAt)])
    const mockAppointment = { id: 'a1', ...validBody }
    ;(prisma.appointment.create as jest.Mock).mockResolvedValue(mockAppointment)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('a1')
  })
})
