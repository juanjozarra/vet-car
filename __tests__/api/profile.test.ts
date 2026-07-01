import { PATCH } from '@/app/api/profile/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { update: jest.fn() } },
}))

const mockSession = { user: { id: 'u1', role: 'OWNER', name: 'Alice', email: 'a@a.com' } }

function makeRequest(body: object) {
  return new Request('http://localhost/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/profile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await PATCH(makeRequest({ name: 'Alice B' }))
    expect(res.status).toBe(401)
  })

  it('updates only the requesting user, ignoring id/role/email/workshopId in the payload', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'u1', name: 'Alice B', email: 'a@a.com', phone: '123', address: 'Calle Falsa 123', image: null,
    })
    const res = await PATCH(makeRequest({
      name: 'Alice B', phone: '123', address: 'Calle Falsa 123',
      id: 'someone-else', role: 'MECHANIC', email: 'hacked@a.com', workshopId: 'ws-1',
    }))
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Alice B', phone: '123', address: 'Calle Falsa 123' },
      select: { id: true, name: true, email: true, phone: true, address: true, image: true },
    })
  })

  it('only updates provided fields', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: 'u1' })
    await PATCH(makeRequest({ phone: '555' }))
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { phone: '555' },
      select: { id: true, name: true, email: true, phone: true, address: true, image: true },
    })
  })
})
