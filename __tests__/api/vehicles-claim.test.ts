import { POST } from '@/app/api/vehicles/claim/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/prisma', () => ({
  prisma: { vehicle: { updateMany: jest.fn(), findUnique: jest.fn() } },
}))

const ownerSession = { user: { id: 'owner-1', role: 'OWNER', workshopId: null } }

function claimRequest(body: unknown) {
  return new Request('http://localhost/api/vehicles/claim', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/vehicles/claim', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 403 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(claimRequest({ vin: '1HGBH41JXMN109186' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'm1', role: 'MECHANIC', workshopId: 'w1' },
    })
    const res = await POST(claimRequest({ vin: '1HGBH41JXMN109186' }))
    expect(res.status).toBe(403)
    expect(prisma.vehicle.updateMany).not.toHaveBeenCalled()
  })

  it('returns 400 when the vin is missing', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    const res = await POST(claimRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the vin is blank', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    const res = await POST(claimRequest({ vin: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the vin is not a string', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    const res = await POST(claimRequest({ vin: 12345 }))
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown vin', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
    const res = await POST(claimRequest({ vin: 'NOSUCHVIN000000' }))
    expect(res.status).toBe(404)
  })

  // The security property this endpoint exists to protect: an already-claimed
  // VIN must be indistinguishable from one that was never recorded, or the
  // endpoint becomes a VIN oracle.
  it('returns a byte-identical 404 for an already-owned vin and an unknown one', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

    const unknown = await POST(claimRequest({ vin: 'NOSUCHVIN000000' }))
    const unknownBody = await unknown.text()

    const owned = await POST(claimRequest({ vin: '1HGBH41JXMN109186' }))
    const ownedBody = await owned.text()

    expect(owned.status).toBe(unknown.status)
    expect(ownedBody).toBe(unknownBody)
  })

  it('only matches unowned vehicles, so an owned vin is never reassigned', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
    await POST(claimRequest({ vin: '1HGBH41JXMN109186' }))

    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { vin: '1HGBH41JXMN109186', ownerId: null },
      data: { ownerId: 'owner-1' },
    })
  })

  it('normalizes the vin so casing and whitespace do not defeat the lookup', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 0 })
    await POST(claimRequest({ vin: '  1hgbh41jxmn109186  ' }))

    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
      where: { vin: '1HGBH41JXMN109186', ownerId: null },
      data: { ownerId: 'owner-1' },
    })
  })

  it('sets ownerId and returns the vehicle on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(ownerSession)
    ;(prisma.vehicle.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v1',
      vin: '1HGBH41JXMN109186',
      ownerId: 'owner-1',
    })

    const res = await POST(claimRequest({ vin: '1HGBH41JXMN109186' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ id: 'v1', vin: '1HGBH41JXMN109186', ownerId: 'owner-1' })
  })
})
