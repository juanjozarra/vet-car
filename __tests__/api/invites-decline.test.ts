jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workshopInvite', () => ({ getPendingInvite: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { workshopInvite: { update: jest.fn() } },
}))

import { POST } from '@/app/api/invites/[token]/decline/route'
import { getServerSession } from 'next-auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetPendingInvite = getPendingInvite as jest.Mock
const mockUpdate = prisma.workshopInvite.update as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/invites/tok/decline', { method: 'POST' })
}
const params = Promise.resolve({ token: 'tok' })

const pendingInvite = { id: 'inv1', workshopId: 'ws1', email: 'mech@test.com' }
const mechanicSession = {
  user: { id: 'm1', role: 'MECHANIC', email: 'mech@test.com', workshopId: null },
}

describe('POST /api/invites/[token]/decline', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 410 when the invite is not usable', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(null)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(410)
  })

  it("returns 403 when the caller's email does not match the invite", async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, email: 'other@test.com' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('marks the invite DECLINED and returns 204', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(204)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { status: 'DECLINED' } })
  })
})
