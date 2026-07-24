jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/workshopInvite', () => ({ getPendingInvite: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: jest.fn() },
    workshopInvite: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))

import { POST } from '@/app/api/invites/[token]/accept/route'
import { getServerSession } from 'next-auth'
import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockGetPendingInvite = getPendingInvite as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeRequest() {
  return new Request('http://localhost/api/invites/tok/accept', { method: 'POST' })
}
const params = Promise.resolve({ token: 'tok' })

const pendingInvite = { id: 'inv1', workshopId: 'ws1', email: 'mech@test.com' }
const mechanicSession = {
  user: { id: 'm1', role: 'MECHANIC', email: 'mech@test.com', workshopId: null },
}

describe('POST /api/invites/[token]/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
  })

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

  it('returns 403 when the caller is an OWNER', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', email: 'mech@test.com', workshopId: null } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it("returns 403 when the caller's email does not match the invite", async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, email: 'other@test.com' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 409 when the caller already belongs to a workshop', async () => {
    mockGetServerSession.mockResolvedValue({ ...mechanicSession, user: { ...mechanicSession.user, workshopId: 'ws-existing' } })
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('joins the workshop as STAFF and marks the invite ACCEPTED', async () => {
    mockGetServerSession.mockResolvedValue(mechanicSession)
    mockGetPendingInvite.mockResolvedValue(pendingInvite)
    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.workshopId).toBe('ws1')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    expect(prisma.workshopInvite.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'ACCEPTED' },
    })
  })
})
