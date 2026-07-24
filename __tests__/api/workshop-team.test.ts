jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: jest.fn() } },
}))

import { GET } from '@/app/api/workshop/team/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockFindMany = prisma.user.findMany as jest.Mock

describe('GET /api/workshop/team', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 403 for an owner', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'o1', role: 'OWNER', workshopId: null } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic with no workshop', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'm1', role: 'MECHANIC', workshopId: null } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists mechanics in the caller workshop for STAFF too', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'staff1', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
    })
    mockFindMany.mockResolvedValue([{ id: 'a1', name: 'Ana', email: 'ana@test.com', workshopRole: 'ADMIN' }])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workshopId: 'ws1' },
      select: { id: true, name: true, email: true, workshopRole: true },
      orderBy: { createdAt: 'asc' },
    })
  })
})
