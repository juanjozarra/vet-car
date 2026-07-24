jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}))

import { DELETE } from '@/app/api/workshop/team/[userId]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockUpdate = prisma.user.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/workshop/team/staff1', { method: 'DELETE' })
}

const adminSession = {
  user: { id: 'admin1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}

describe('DELETE /api/workshop/team/[userId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff2', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(403)
  })

  it('returns 400 when the admin targets themself', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    const res = await DELETE(
      new Request('http://localhost/api/workshop/team/admin1', { method: 'DELETE' }),
      { params: Promise.resolve({ userId: 'admin1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when the target does not exist', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue(null)
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the target belongs to a different workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws-other', workshopRole: 'STAFF' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the target is another ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws1', workshopRole: 'ADMIN' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(400)
  })

  it('clears workshopId and workshopRole and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindUnique.mockResolvedValue({ id: 'staff1', workshopId: 'ws1', workshopRole: 'STAFF' })
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ userId: 'staff1' }) })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'staff1' },
      data: { workshopId: null, workshopRole: null },
    })
  })
})
