jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    workshopInvite: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

import { DELETE } from '@/app/api/workshop/invites/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.workshopInvite.findUnique as jest.Mock
const mockUpdate = prisma.workshopInvite.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/workshop/invites/inv1', { method: 'DELETE' })
}

const params = Promise.resolve({ id: 'inv1' })
const adminSession = {
  user: { id: 'admin1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}

describe('DELETE /api/workshop/invites/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 404 when the invite does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it("returns 404 when the invite belongs to a different workshop", async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'inv1', workshopId: 'ws-other' })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('cancels the invite and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'inv1', workshopId: 'ws1' })
    const res = await DELETE(makeRequest(), { params })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { status: 'CANCELLED' } })
  })
})
