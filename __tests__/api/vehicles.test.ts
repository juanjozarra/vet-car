import { POST } from '@/app/api/vehicles/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { vehicle: { create: jest.fn() } },
}))

const mockSession = { user: { id: 'u1', role: 'OWNER', name: 'Alice', email: 'a@a.com' } }

describe('POST /api/vehicles', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when role is MECHANIC', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'u1', role: 'MECHANIC' },
    })
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when make is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when model is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 201 with vehicle data on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    const mockVehicle = { id: 'v1', make: 'Honda', model: 'CR-V', year: 2019, ownerId: 'u1' }
    ;(prisma.vehicle.create as jest.Mock).mockResolvedValue(mockVehicle)
    const req = new Request('http://localhost/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ make: 'Honda', model: 'CR-V', year: '2019' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.make).toBe('Honda')
    expect(data.year).toBe(2019)
  })
})
