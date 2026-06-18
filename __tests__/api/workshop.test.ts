jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshop: { create: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST } from '@/app/api/workshop/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockWorkshopCreate = prisma.workshop.create as jest.Mock
const mockUserUpdate = prisma.user.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/workshop', {
    method: 'POST',
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
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 401 when user is not a mechanic', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'OWNER', workshopId: null } })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 409 when workshop already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: 'ws-existing' } })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
  })

  it('returns 400 when required fields are missing', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    const res = await POST(makeRequest({ name: 'AutoShop' }))
    expect(res.status).toBe(400)
  })

  it('creates workshop, updates user, and returns 201', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'MECHANIC', workshopId: null } })
    mockWorkshopCreate.mockResolvedValue({ id: 'ws-1', ...validBody })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    expect(mockWorkshopCreate).toHaveBeenCalledWith({
      data: { name: 'AutoShop', address: '123 Main St', phone: '555-0100', email: 'shop@example.com' },
    })
    expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { workshopId: 'ws-1' } })
    const data = await res.json()
    expect(data.id).toBe('ws-1')
  })
})
