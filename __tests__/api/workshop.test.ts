jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshop: { create: jest.fn(), update: jest.fn() },
    workshopHours: { deleteMany: jest.fn(), createMany: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST, PATCH } from '@/app/api/workshop/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const mockGetServerSession = getServerSession as jest.Mock
const mockWorkshopCreate = prisma.workshop.create as jest.Mock
const mockWorkshopUpdate = prisma.workshop.update as jest.Mock
const mockUserUpdate = prisma.user.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest(method: string, body: object) {
  return new Request('http://localhost/api/workshop', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' }

describe('POST /api/workshop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not a mechanic', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(401)
  })

  it('returns 409 when workshop already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: 'ws-existing' } })
    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(409)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest('POST', { name: 'AutoShop' }))
    expect(res.status).toBe(400)
  })

  it('creates workshop, sets the creator as ADMIN, and returns 201', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1', ...validBody })

    const res = await POST(makeRequest('POST', validBody))
    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' },
    })
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { workshopId: 'ws-1', workshopRole: 'ADMIN' },
    })
    const data = await res.json()
    expect(data.id).toBe('ws-1')
  })

  it('persists the Google Places location when provided', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1' })

    const res = await POST(makeRequest('POST', {
      ...validBody,
      latitude: -34.6037,
      longitude: -58.3816,
      googlePlaceId: 'place-1',
    }))

    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: {
        name: 'AutoShop',
        address: '123 Main St',
        phone: '555-0100',
        email: 'shop@example.com',
        latitude: -34.6037,
        longitude: -58.3816,
        googlePlaceId: 'place-1',
      },
    })
  })

  it('returns 409 when another workshop already uses that Google place', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.8.0' })
    )

    const res = await POST(makeRequest('POST', { ...validBody, googlePlaceId: 'place-1' }))

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Ya hay un taller registrado en esa ubicación. Pedile a un administrador que te invite a su equipo.',
    })
  })

  it('returns 400 when latitude is given without longitude', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest('POST', { ...validBody, latitude: -34.6037 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when latitude is not a number', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest('POST', { ...validBody, latitude: 'abc', longitude: -58.3816 }))
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/workshop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma))
  })

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is STAFF, not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(403)
    expect(mockWorkshopUpdate).not.toHaveBeenCalled()
  })

  it('updates workshop settings and returns 200 for ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'a1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
    })
    mockWorkshopUpdate.mockResolvedValue({ id: 'ws1', slotDurationMinutes: 90 })

    const res = await PATCH(makeRequest('PATCH', { slotDurationMinutes: 90 }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.slotDurationMinutes).toBe(90)
  })
})
