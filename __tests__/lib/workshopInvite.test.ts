jest.mock('@/lib/prisma', () => ({
  prisma: { workshopInvite: { findUnique: jest.fn() } },
}))

import { getPendingInvite } from '@/lib/workshopInvite'
import { prisma } from '@/lib/prisma'

const mockFindUnique = prisma.workshopInvite.findUnique as jest.Mock

describe('getPendingInvite', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null when the invite does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns null when the invite is not PENDING', async () => {
    mockFindUnique.mockResolvedValue({
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() + 86_400_000),
    })
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns null when the invite has expired', async () => {
    mockFindUnique.mockResolvedValue({
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(await getPendingInvite('tok')).toBeNull()
  })

  it('returns the invite when PENDING and unexpired', async () => {
    const invite = {
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86_400_000),
      email: 'm@test.com',
      workshop: { name: 'AutoShop', address: '123 Main St' },
    }
    mockFindUnique.mockResolvedValue(invite)
    expect(await getPendingInvite('tok')).toEqual(invite)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: 'tok' },
      include: { workshop: { select: { name: true, address: true } } },
    })
  })
})
