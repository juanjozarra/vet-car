jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/email', () => ({ sendWorkshopInviteEmail: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    workshop: { findUnique: jest.fn() },
    workshopInvite: { upsert: jest.fn(), findMany: jest.fn() },
  },
}))

import { POST, GET } from '@/app/api/workshop/invites/route'
import { getServerSession } from 'next-auth'
import { sendWorkshopInviteEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const mockGetServerSession = getServerSession as jest.Mock
const mockSend = sendWorkshopInviteEmail as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockWorkshopFindUnique = prisma.workshop.findUnique as jest.Mock
const mockUpsert = prisma.workshopInvite.upsert as jest.Mock
const mockFindMany = prisma.workshopInvite.findMany as jest.Mock

function makeRequest(body: object) {
  return new Request('http://localhost/api/workshop/invites', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const adminSession = {
  user: { id: 'admin1', name: 'Ana', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'ADMIN' },
}
const staffSession = {
  user: { id: 'staff1', name: 'Beto', role: 'MECHANIC', workshopId: 'ws1', workshopRole: 'STAFF' },
}

describe('POST /api/workshop/invites', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(staffSession)
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when email is missing', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the target email belongs to an OWNER', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'OWNER', workshopId: null })
    const res = await POST(makeRequest({ email: 'owner@test.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when the target is a mechanic already in a workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'MECHANIC', workshopId: 'ws-other' })
    const res = await POST(makeRequest({ email: 'mech@test.com' }))
    expect(res.status).toBe(409)
  })

  it('returns 500 and does not persist an invite when the email fails to send', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue(null)
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockRejectedValue(new Error('bounced'))
    const res = await POST(makeRequest({ email: 'new@test.com' }))
    expect(res.status).toBe(500)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('surfaces the provider reason so a failed invite is diagnosable', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue(null)
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockRejectedValue(new Error('The gmail.com domain is not verified'))
    const res = await POST(makeRequest({ email: 'new@test.com' }))
    const body = await res.json()
    expect(body.error).toContain('The gmail.com domain is not verified')
  })

  it('sends the email and upserts the invite for an unregistered email', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue(null)
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockResolvedValue(undefined)
    mockUpsert.mockResolvedValue({ id: 'inv1', email: 'new@test.com', expiresAt: new Date() })

    const res = await POST(makeRequest({ email: 'New@Test.com' }))
    expect(res.status).toBe(201)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@test.com', workshopName: 'AutoShop', inviterName: 'Ana' })
    )
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workshopId_email: { workshopId: 'ws1', email: 'new@test.com' } },
      })
    )
  })

  it('allows re-inviting a mechanic with no workshop yet', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockUserFindUnique.mockResolvedValue({ role: 'MECHANIC', workshopId: null })
    mockWorkshopFindUnique.mockResolvedValue({ name: 'AutoShop' })
    mockSend.mockResolvedValue(undefined)
    mockUpsert.mockResolvedValue({ id: 'inv2', email: 'free@test.com', expiresAt: new Date() })

    const res = await POST(makeRequest({ email: 'free@test.com' }))
    expect(res.status).toBe(201)
  })
})

describe('GET /api/workshop/invites', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 when caller is not ADMIN', async () => {
    mockGetServerSession.mockResolvedValue(staffSession)
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists pending invites for the workshop', async () => {
    mockGetServerSession.mockResolvedValue(adminSession)
    mockFindMany.mockResolvedValue([{ id: 'inv1', email: 'a@test.com' }])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workshopId: 'ws1', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, createdAt: true, expiresAt: true },
    })
  })
})
